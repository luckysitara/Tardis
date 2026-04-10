use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked},
};
use crate::state::LendingPool;
use crate::error::LendingError;

#[derive(Accounts)]
pub struct WithdrawPoolFunds<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,

    #[account(
        mut,
        has_one = lender @ LendingError::Unauthorized,
    )]
    pub pool_account: Box<Account<'info, LendingPool>>,

    #[account(
        mut,
        seeds = [b"pool_vault", pool_account.key().as_ref()],
        bump = pool_account.vault_bump,
    )]
    pub pool_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub loan_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = lender_loan_ata.mint == loan_mint.key(),
        constraint = lender_loan_ata.owner == lender.key(),
    )]
    pub lender_loan_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn withdraw_pool_funds_handler(ctx: Context<WithdrawPoolFunds>, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool_account;

    // 1. Safety Check: Cannot withdraw more than is available
    require!(amount <= pool.remaining_liquidity, LendingError::InsufficientLiquidity);

    // 2. Update state FIRST (Accounting before Banking)
    pool.remaining_liquidity -= amount;
    pool.total_liquidity -= amount;

    // 3. Transfer funds to lender
    let seeds: &[&[&[u8]]] = &[&[
        b"pool",
        pool.lender.as_ref(),
        pool.loan_mint.as_ref(),
        &[pool.pool_bump],
    ]];

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.pool_vault.to_account_info(),
        mint: ctx.accounts.loan_mint.to_account_info(),
        to: ctx.accounts.lender_loan_ata.to_account_info(),
        authority: pool.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    transfer_checked(
        CpiContext::new_with_signer(cpi_program, cpi_accounts, seeds),
        amount,
        ctx.accounts.loan_mint.decimals
    )?;

    Ok(())
}
