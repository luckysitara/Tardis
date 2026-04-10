use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked},
};
use crate::state::{LendingPool, ActiveLoan};

#[derive(Accounts)]
pub struct RepayPoolLoan<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(mut)]
    pub pool_account: Box<Account<'info, LendingPool>>,

    #[account(
        mut,
        seeds = [b"pool_vault", pool_account.key().as_ref()],
        bump = pool_account.vault_bump,
    )]
    pub pool_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"active_loan", borrower.key().as_ref(), pool_account.key().as_ref(), &active_loan.loan_id.to_le_bytes()],
        bump = active_loan.bump,
        constraint = active_loan.borrower == borrower.key(),
        constraint = active_loan.pool == pool_account.key(),
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

    pub loan_mint: InterfaceAccount<'info, Mint>,
    pub collateral_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = borrower_loan_ata.mint == loan_mint.key(),
        constraint = borrower_loan_ata.owner == borrower.key(),
    )]
    pub borrower_loan_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = borrower_collateral_ata.mint == collateral_mint.key(),
        constraint = borrower_collateral_ata.owner == borrower.key(),
    )]
    pub borrower_collateral_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn repay_pool_loan_handler(ctx: Context<RepayPoolLoan>) -> Result<()> {
    let active_loan = &mut ctx.accounts.active_loan;
    let pool = &mut ctx.accounts.pool_account;

    // 1. Update Loan and Pool state FIRST (Re-entrancy protection)
    active_loan.status = 1; // Repaid
    pool.remaining_liquidity += active_loan.amount_borrowed; // Add principal back to pool

    // 2. Transfer Repayment (USDC) from Borrower to Pool Vault
    let cpi_repayment = TransferChecked {
        from: ctx.accounts.borrower_loan_ata.to_account_info(),
        mint: ctx.accounts.loan_mint.to_account_info(),
        to: ctx.accounts.pool_vault.to_account_info(),
        authority: ctx.accounts.borrower.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    transfer_checked(
        CpiContext::new(cpi_program.clone(), cpi_repayment),
        active_loan.repayment_amount,
        ctx.accounts.loan_mint.decimals
    )?;

    // 3. Release Collateral (SKR) from Loan Vault to Borrower
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"active_loan",
        active_loan.borrower.as_ref(),
        active_loan.pool.as_ref(),
        &active_loan.loan_id.to_le_bytes(),
        &[active_loan.bump],
    ]];

    let cpi_release = TransferChecked {
        from: ctx.accounts.loan_vault.to_account_info(),
        mint: ctx.accounts.collateral_mint.to_account_info(),
        to: ctx.accounts.borrower_collateral_ata.to_account_info(),
        authority: active_loan.to_account_info(),
    };
    
    transfer_checked(
        CpiContext::new_with_signer(cpi_program, cpi_release, signer_seeds),
        active_loan.collateral_amount,
        ctx.accounts.collateral_mint.decimals
    )?;

    Ok(())
}
