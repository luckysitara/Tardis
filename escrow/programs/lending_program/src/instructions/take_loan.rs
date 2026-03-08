use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked},
};
use crate::state::{LendingPool, ActiveLoan};
use crate::instructions::check_asset_value;
use crate::error::LendingError;

#[derive(Accounts)]
pub struct TakeLoan<'info> {
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

    pub loan_mint: InterfaceAccount<'info, Mint>,
    pub collateral_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = borrower_collateral_ata.mint == collateral_mint.key(),
        constraint = borrower_collateral_ata.owner == borrower.key(),
    )]
    pub borrower_collateral_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = borrower_loan_ata.mint == loan_mint.key(),
        constraint = borrower_loan_ata.owner == borrower.key(),
    )]
    pub borrower_loan_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = borrower,
        space = 8 + ActiveLoan::INIT_SPACE,
        seeds = [b"active_loan", borrower.key().as_ref(), pool_account.key().as_ref(), &pool_account.remaining_liquidity.to_le_bytes()],
        bump
    )]
    pub active_loan: Box<Account<'info, ActiveLoan>>,

    #[account(
        init,
        payer = borrower,
        seeds = [b"loan_vault", active_loan.key().as_ref()],
        bump,
        token::mint = collateral_mint,
        token::authority = active_loan,
    )]
    pub loan_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Oracle for SKR/USD price
    pub pyth_price_info: AccountInfo<'info>,
    /// CHECK: Oracle for SKR/USD price
    pub switchboard_price_info: AccountInfo<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn take_loan_handler(
    ctx: Context<TakeLoan>,
    amount_to_borrow: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool_account;
    
    // 1. Validation
    require!(amount_to_borrow >= pool.min_borrow, LendingError::CalculationError);
    require!(amount_to_borrow <= pool.max_borrow, LendingError::CalculationError);
    require!(amount_to_borrow <= pool.remaining_liquidity, LendingError::CalculationError);

    // 2. Oracle Check: Get SKR Price (scaled to 6 decimals)
    let skr_price_usd = check_asset_value(
        &ctx.accounts.pyth_price_info,
        &ctx.accounts.switchboard_price_info
    )?;

    // 3. Collateral Calculation (150%)
    let interest_bps = pool.interest_rate;
    let repayment_amount = amount_to_borrow + (amount_to_borrow * interest_bps / 10000);
    
    // Repayment value in USD (6 decimals) * 1.5
    let required_collateral_usd = (repayment_amount as f64 * 1.5) as u64;
    
    // Convert USD value back to SKR amount
    let collateral_amount = (required_collateral_usd as f64 / skr_price_usd as f64 * 1_000_000_000.0) as u64;

    // 4. Initialize Active Loan
    let loan = &mut ctx.accounts.active_loan;
    loan.borrower = ctx.accounts.borrower.key();
    loan.pool = pool.key();
    loan.collateral_mint = ctx.accounts.collateral_mint.key();
    loan.amount_borrowed = amount_to_borrow;
    loan.repayment_amount = repayment_amount;
    loan.collateral_amount = collateral_amount;
    loan.expiry = Clock::get()?.unix_timestamp + 86400 * 7; // Default 7 days
    loan.status = 0; // Active
    loan.bump = ctx.bumps.active_loan;

    // 5. Transfer Collateral (SKR) to Vault
    let cpi_collateral = TransferChecked {
        from: ctx.accounts.borrower_collateral_ata.to_account_info(),
        mint: ctx.accounts.collateral_mint.to_account_info(),
        to: ctx.accounts.loan_vault.to_account_info(),
        authority: ctx.accounts.borrower.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    transfer_checked(
        CpiContext::new(cpi_program.clone(), cpi_collateral),
        collateral_amount,
        ctx.accounts.collateral_mint.decimals
    )?;

    // 6. Transfer Loan (USDC) to Borrower (Using Pool Vault as Source)
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"pool",
        pool.lender.as_ref(),
        pool.loan_mint.as_ref(),
        &[pool.pool_bump],
    ]];

    let cpi_loan = TransferChecked {
        from: ctx.accounts.pool_vault.to_account_info(),
        mint: ctx.accounts.loan_mint.to_account_info(),
        to: ctx.accounts.borrower_loan_ata.to_account_info(),
        authority: pool.to_account_info(),
    };
    
    // FIX: Nest CpiContext::new inside with_signer
    transfer_checked(
        CpiContext::new_with_signer(cpi_program, cpi_loan, signer_seeds),
        amount_to_borrow,
        ctx.accounts.loan_mint.decimals
    )?;

    // 7. Update Pool Liquidity
    pool.remaining_liquidity -= amount_to_borrow;

    Ok(())
}
