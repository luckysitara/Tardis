use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked, close_account, CloseAccount},
};
use crate::state::LendingPool;
use crate::error::LendingError;

#[derive(Accounts)]
pub struct ClosePool<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,

    #[account(
        mut,
        has_one = lender @ LendingError::Unauthorized,
        close = lender // Recover SOL rent
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

pub fn close_pool_handler(ctx: Context<ClosePool>) -> Result<()> {
    let pool = &ctx.accounts.pool_account;

    // 1. CRITICAL SAFETY CHECK: Cannot close pool if funds are currently lent out
    // If total_liquidity > remaining_liquidity, it means someone still owes money
    require!(
        pool.total_liquidity == pool.remaining_liquidity, 
        LendingError::InsufficientLiquidity 
    );

    // 2. Transfer all remaining funds to lender
    if pool.remaining_liquidity > 0 {
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
            authority: ctx.accounts.pool_account.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        transfer_checked(
            CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts, seeds),
            pool.remaining_liquidity,
            ctx.accounts.loan_mint.decimals
        )?;

        // 3. Close the Token Vault account (recover more rent)
        let close_accounts = CloseAccount {
            account: ctx.accounts.pool_vault.to_account_info(),
            destination: ctx.accounts.lender.to_account_info(),
            authority: ctx.accounts.pool_account.to_account_info(),
        };
        let close_ctx = CpiContext::new_with_signer(cpi_program, close_accounts, seeds);
        close_account(close_ctx)?;
    }

    Ok(())
}
