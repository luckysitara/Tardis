use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked},
};
use crate::state::{LendingPool, ActiveLoan};
use crate::instructions::check_asset_value;
use crate::error::LendingError;

#[derive(Accounts)]
pub struct LiquidatePoolLoan<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,

    #[account(mut)]
    pub pool_account: Box<Account<'info, LendingPool>>,

    #[account(
        mut,
        seeds = [b"active_loan", active_loan.borrower.as_ref(), pool_account.key().as_ref(), &active_loan.loan_id.to_le_bytes()],
        bump = active_loan.bump,
        constraint = active_loan.pool == pool_account.key(),
        constraint = pool_account.lender == lender.key(),
        constraint = active_loan.status == 0, // Active
    )]
    pub active_loan: Box<Account<'info, ActiveLoan>>,

    #[account(
        mut,
        seeds = [b"loan_vault", active_loan.key().as_ref()],
        bump,
        token::mint = active_loan.collateral_mint,
        token::authority = active_loan,
    )]
    pub loan_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub collateral_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = lender_collateral_ata.mint == collateral_mint.key(),
        constraint = lender_collateral_ata.owner == lender.key(),
    )]
    pub lender_collateral_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Oracle for SKR/USD price
    pub pyth_price_info: AccountInfo<'info>,
    /// CHECK: Oracle for SKR/USD price
    pub switchboard_price_info: AccountInfo<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn liquidate_pool_loan_handler(ctx: Context<LiquidatePoolLoan>) -> Result<()> {
    let active_loan = &mut ctx.accounts.active_loan;
    let _pool = &mut ctx.accounts.pool_account;
    let clock = Clock::get()?;

    // 1. Check if liquidation conditions are met
    let expired = clock.unix_timestamp > active_loan.expiry;

    let skr_price_usd = check_asset_value(
        &ctx.accounts.pyth_price_info,
        &ctx.accounts.switchboard_price_info
    )?;

    let current_value_usd = (active_loan.collateral_amount as f64 * skr_price_usd as f64 / 1_000_000_000.0) as u64;
    let threshold_usd = (active_loan.repayment_amount as f64 * 1.1) as u64;
    let undercollateralized = current_value_usd < threshold_usd;

    require!(expired || undercollateralized, LendingError::CalculationError);

    // 2. Update status FIRST (Re-entrancy protection)
    active_loan.status = 2; // Liquidated

    // 3. Transfer all collateral (SKR) to Lender
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"active_loan",
        active_loan.borrower.as_ref(),
        active_loan.pool.as_ref(),
        &active_loan.loan_id.to_le_bytes(),
        &[active_loan.bump],
    ]];

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.loan_vault.to_account_info(),
        mint: ctx.accounts.collateral_mint.to_account_info(),
        to: ctx.accounts.lender_collateral_ata.to_account_info(),
        authority: active_loan.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    
    transfer_checked(
        CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
        active_loan.collateral_amount,
        ctx.accounts.collateral_mint.decimals
    )?;

    Ok(())
}
