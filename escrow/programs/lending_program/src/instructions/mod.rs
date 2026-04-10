use anchor_lang::prelude::*;
use crate::error::LendingError;
use switchboard_on_demand::PullFeedAccountData;
use bytemuck::{Pod, Zeroable};

pub mod initialize_loan;
pub mod accept_loan;
pub mod repay_loan;
pub mod liquidate;
pub mod create_pool;
pub mod take_loan;
pub mod repay_pool_loan;
pub mod liquidate_pool_loan;
pub mod withdraw_pool_funds;
pub mod close_pool;

pub use initialize_loan::*;
pub use accept_loan::*;
pub use repay_loan::*;
pub use liquidate::*;
pub use create_pool::*;
pub use take_loan::*;
pub use repay_pool_loan::*;
pub use liquidate_pool_loan::*;
pub use withdraw_pool_funds::*;
pub use close_pool::*;

// -----------------------------------------------------------------
// Lightweight Pyth Price Parsing (No External Crate Required)
// -----------------------------------------------------------------
#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
pub struct PythPriceAccount {
    pub magic: u32,
    pub version: u32,
    pub type_id: u32,
    pub size: u32,
    pub price_type: u32,
    pub exponent: i32,
    pub num_publishers: u32,
    pub num_active_publishers: u32,
    pub last_slot: u64,
    pub valid_slot: u64,
    pub ema_price: i64,
    pub ema_conf: u64,
    pub timestamp: i64,
    pub prev_timestamp: i64,
    pub prev_price: i64,
    pub prev_conf: u64,
    pub prev_slot: u64,
    pub price: i64,
    pub conf: u64,
}

/// Helper function to check asset value using a manual Pyth parser and Switchboard On-Demand.
pub fn check_asset_value(
    pyth_price_info: &AccountInfo,
    switchboard_price_info: &AccountInfo,
) -> Result<u64> {
    let clock = Clock::get()?;

    // 1. Manually parse Pyth Price
    let pyth_data = pyth_price_info.try_borrow_data()?;
    let pyth_price_account = bytemuck::try_from_bytes::<PythPriceAccount>(&pyth_data[..80])
        .map_err(|_| error!(LendingError::CalculationError))?;
    
    let pyth_val = pyth_price_account.price as f64 * 10f64.powi(pyth_price_account.exponent);

    // 2. Get Switchboard On-Demand Price
    let sb_feed = PullFeedAccountData::parse(switchboard_price_info.data.borrow())
        .map_err(|_| error!(LendingError::CalculationError))?;
    let sb_result = sb_feed.get_value(clock.slot, 120, 1, true)
        .map_err(|_| error!(LendingError::CalculationError))?;
    
    let sb_val: f64 = sb_result.try_into()
        .map_err(|_| error!(LendingError::CalculationError))?;

    // Return the average price in 6 decimal places as u64
    Ok(((pyth_val + sb_val) / 2.0 * 1_000_000.0) as u64)
}
