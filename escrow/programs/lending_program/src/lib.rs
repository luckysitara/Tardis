use anchor_lang::prelude::*;
use instructions::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

declare_id!("E3BgKRdiLizpKkbeB6txw5VB4DUZUduQJnSF1Nikb4XP");

#[program]
pub mod lending_program {
    use super::*;

    pub fn create_pool(
        ctx: Context<CreatePool>,
        total_liquidity: u64,
        min_borrow: u64,
        max_borrow: u64,
        interest_rate: u64,
    ) -> Result<()> {
        instructions::create_pool::create_pool_handler(ctx, total_liquidity, min_borrow, max_borrow, interest_rate)
    }

    pub fn take_loan(ctx: Context<TakeLoan>, amount_to_borrow: u64) -> Result<()> {
        instructions::take_loan::take_loan_handler(ctx, amount_to_borrow)
    }

    pub fn repay_pool_loan(ctx: Context<RepayPoolLoan>) -> Result<()> {
        instructions::repay_pool_loan::repay_pool_loan_handler(ctx)
    }

    pub fn liquidate_pool_loan(ctx: Context<LiquidatePoolLoan>) -> Result<()> {
        instructions::liquidate_pool_loan::liquidate_pool_loan_handler(ctx)
    }

    pub fn withdraw_pool_funds(ctx: Context<WithdrawPoolFunds>, amount: u64) -> Result<()> {
        instructions::withdraw_pool_funds::withdraw_pool_funds_handler(ctx, amount)
    }

    pub fn close_pool(ctx: Context<ClosePool>) -> Result<()> {
        instructions::close_pool::close_pool_handler(ctx)
    }
}
