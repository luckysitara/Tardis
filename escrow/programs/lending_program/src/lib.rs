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

    pub fn initialize_loan(
        ctx: Context<InitializeLoan>,
        collateral_amount: u64,
        loan_amount: u64,
        repayment_amount: u64,
        expiry: i64,
    ) -> Result<()> {
        instructions::initialize_loan::initialize_loan_handler(ctx, collateral_amount, loan_amount, repayment_amount, expiry)
    }

    pub fn accept_loan(ctx: Context<AcceptLoan>) -> Result<()> {
        instructions::accept_loan::accept_loan_handler(ctx)
    }

    pub fn repay_loan(ctx: Context<RepayLoan>) -> Result<()> {
        instructions::repay_loan::repay_loan_handler(ctx)
    }

    pub fn liquidate(ctx: Context<Liquidate>) -> Result<()> {
        instructions::liquidate::liquidate_handler(ctx)
    }
}
