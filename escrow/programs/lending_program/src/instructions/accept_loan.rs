use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked},
};
use crate::state::{Loan, STATUS_REQUESTED, STATUS_ACTIVE};
use crate::error::LendingError;
use crate::instructions::check_asset_value;

#[derive(Accounts)]
pub struct AcceptLoan<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,

    #[account(mut)]
    pub borrower: SystemAccount<'info>,

    pub loan_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = lender_loan_ata.mint == loan_mint.key(),
        constraint = lender_loan_ata.owner == lender.key(),
    )]
    pub lender_loan_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = borrower_loan_ata.mint == loan_mint.key(),
        constraint = borrower_loan_ata.owner == borrower.key(),
    )]
    pub borrower_loan_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"loan", borrower.key().as_ref(), loan_account.collateral_mint.as_ref()],
        bump = loan_account.bump,
        constraint = loan_account.status == STATUS_REQUESTED @ LendingError::InvalidStatus,
    )]
    pub loan_account: Account<'info, Loan>,

    /// CHECK: Pyth Price Feed
    pub pyth_price_info: AccountInfo<'info>,
    /// CHECK: Switchboard Price Feed
    pub switchboard_price_info: AccountInfo<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn accept_loan_handler(ctx: Context<AcceptLoan>) -> Result<()> {
    let loan = &mut ctx.accounts.loan_account;

    // 1. Check asset value using oracles
    let collateral_price = check_asset_value(
        &ctx.accounts.pyth_price_info,
        &ctx.accounts.switchboard_price_info,
    )?;

    // Ensure collateral value > loan amount (simplified LTV check)
    // Assume prices are in 6 decimals, amounts in token decimals.
    let collateral_value = (loan.collateral_amount as u128)
        .checked_mul(collateral_price as u128)
        .ok_or(LendingError::CalculationError)?
        .checked_div(1_000_000)
        .ok_or(LendingError::CalculationError)? as u64;
    
    require!(collateral_value > loan.loan_amount, LendingError::InsufficientCollateral);

    loan.lender = ctx.accounts.lender.key();
    loan.status = STATUS_ACTIVE;

    // 2. Transfer loan amount from lender to borrower
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.lender_loan_ata.to_account_info(),
        mint: ctx.accounts.loan_mint.to_account_info(),
        to: ctx.accounts.borrower_loan_ata.to_account_info(),
        authority: ctx.accounts.lender.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    transfer_checked(cpi_ctx, loan.loan_amount, ctx.accounts.loan_mint.decimals)?;

    Ok(())
}
