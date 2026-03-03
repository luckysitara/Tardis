use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked},
};
use crate::state::{Loan, STATUS_REQUESTED};

#[derive(Accounts)]
pub struct InitializeLoan<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,

    pub collateral_mint: InterfaceAccount<'info, Mint>,
    
    #[account(
        mut,
        constraint = borrower_collateral_ata.mint == collateral_mint.key(),
        constraint = borrower_collateral_ata.owner == borrower.key(),
    )]
    pub borrower_collateral_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = borrower,
        space = 8 + Loan::INIT_SPACE,
        seeds = [b"loan", borrower.key().as_ref(), collateral_mint.key().as_ref()],
        bump
    )]
    pub loan_account: Account<'info, Loan>,

    #[account(
        init,
        payer = borrower,
        seeds = [b"vault", loan_account.key().as_ref()],
        bump,
        token::mint = collateral_mint,
        token::authority = loan_account,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_loan_handler(
    ctx: Context<InitializeLoan>,
    collateral_amount: u64,
    loan_amount: u64,
    repayment_amount: u64,
    expiry: i64,
) -> Result<()> {
    let loan = &mut ctx.accounts.loan_account;
    loan.borrower = ctx.accounts.borrower.key();
    loan.collateral_mint = ctx.accounts.collateral_mint.key();
    loan.collateral_amount = collateral_amount;
    loan.loan_amount = loan_amount;
    loan.repayment_amount = repayment_amount;
    loan.expiry = expiry;
    loan.status = STATUS_REQUESTED;
    loan.bump = ctx.bumps.loan_account;

    // Transfer collateral to vault
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.borrower_collateral_ata.to_account_info(),
        mint: ctx.accounts.collateral_mint.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.borrower.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    transfer_checked(cpi_ctx, collateral_amount, ctx.accounts.collateral_mint.decimals)?;

    Ok(())
}
