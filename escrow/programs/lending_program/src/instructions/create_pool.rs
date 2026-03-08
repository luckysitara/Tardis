use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked},
};
use crate::state::LendingPool;

#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,

    pub loan_mint: InterfaceAccount<'info, Mint>,
    pub collateral_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = lender_loan_ata.mint == loan_mint.key(),
        constraint = lender_loan_ata.owner == lender.key(),
    )]
    pub lender_loan_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = lender,
        space = 8 + LendingPool::INIT_SPACE,
        seeds = [b"pool", lender.key().as_ref(), loan_mint.key().as_ref()],
        bump
    )]
    pub pool_account: Account<'info, LendingPool>,

    #[account(
        init,
        payer = lender,
        seeds = [b"pool_vault", pool_account.key().as_ref()],
        bump,
        token::mint = loan_mint,
        token::authority = pool_account,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn create_pool_handler(
    ctx: Context<CreatePool>,
    total_liquidity: u64,
    min_borrow: u64,
    max_borrow: u64,
    interest_rate: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool_account;
    pool.lender = ctx.accounts.lender.key();
    pool.loan_mint = ctx.accounts.loan_mint.key();
    pool.collateral_mint = ctx.accounts.collateral_mint.key();
    pool.total_liquidity = total_liquidity;
    pool.remaining_liquidity = total_liquidity;
    pool.min_borrow = min_borrow;
    pool.max_borrow = max_borrow;
    pool.interest_rate = interest_rate;
    pool.pool_bump = ctx.bumps.pool_account;
    pool.vault_bump = ctx.bumps.vault;

    // Transfer USDC from lender to vault
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.lender_loan_ata.to_account_info(),
        mint: ctx.accounts.loan_mint.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.lender.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    transfer_checked(cpi_ctx, total_liquidity, ctx.accounts.loan_mint.decimals)?;

    Ok(())
}
