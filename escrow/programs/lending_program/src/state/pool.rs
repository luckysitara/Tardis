use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct LendingPool {
    pub lender: Pubkey,
    pub loan_mint: Pubkey,      // USDC
    pub collateral_mint: Pubkey, // SKR
    pub total_liquidity: u64,
    pub remaining_liquidity: u64,
    pub min_borrow: u64,
    pub max_borrow: u64,
    pub interest_rate: u64,     // APR in basis points (e.g., 500 = 5%)
    pub vault_bump: u8,
    pub pool_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ActiveLoan {
    pub borrower: Pubkey,
    pub pool: Pubkey,
    pub collateral_mint: Pubkey, // Added this field
    pub amount_borrowed: u64,
    pub repayment_amount: u64,
    pub collateral_amount: u64,
    pub expiry: i64,
    pub status: u8, // 0: Active, 1: Repaid, 2: Liquidated
    pub bump: u8,
}
