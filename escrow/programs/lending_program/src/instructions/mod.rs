use anchor_lang::prelude::*;
use crate::error::LendingError;
use switchboard_on_demand::PullFeedAccountData;
use bytemuck::{Pod, Zeroable};

pub mod create_pool;
pub mod take_loan;
pub mod repay_pool_loan;
pub mod liquidate_pool_loan;
pub mod withdraw_pool_funds;
pub mod close_pool;

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
    pub type_: u32,
    pub size: u32,
    pub price_type: u32,
    pub exponent: i32,
    pub publisher_count: u32,
    pub unused: u32,
    pub curr_slot: u64,
    pub valid_slot: u64,
    pub twap_at: i64,
    pub twac_at: i64,
    pub prev_slot: u64,
    pub prev_price: i64,
    pub prev_conf: u64,
    pub prev_timestamp: i64,
    pub price: i64,
    pub conf: u64,
}

pub fn check_asset_value(
    pyth_price_info: &AccountInfo,
    switchboard_feed: &AccountInfo,
) -> Result<u64> {
    // 1. Validate Account Ownership
    // Pyth Oracle (Legacy Push Model): FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH
    let pyth_program_id = pubkey!("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH");
    // Switchboard On-Demand: SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv
    let switchboard_program_id = pubkey!("SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv");

    if pyth_price_info.owner != &pyth_program_id {
        return Err(error!(LendingError::CalculationError));
    }
    if switchboard_feed.owner != &switchboard_program_id {
        return Err(error!(LendingError::CalculationError));
    }

    // 2. Get Pyth Price Safely
    let data = pyth_price_info.try_borrow_data()?;
    if data.len() < std::mem::size_of::<PythPriceAccount>() {
        return Err(error!(LendingError::CalculationError));
    }

    let price_account = bytemuck::from_bytes::<PythPriceAccount>(&data[..std::mem::size_of::<PythPriceAccount>()]);
    
    // Validate Magic Number (0xa1b2c3d4) and Price Type (1 = Price)
    if price_account.magic != 0xa1b2c3d4 || price_account.price_type != 1 {
        return Err(error!(LendingError::CalculationError));
    }

    let pyth_val = (price_account.price as f64) * 10f64.powi(price_account.exponent);

    // 3. Get Switchboard Price (with 60s staleness threshold)
    let feed_data = PullFeedAccountData::parse(switchboard_feed.data.borrow())
        .map_err(|_| error!(LendingError::CalculationError))?;
    
    let sb_result = feed_data.value(60)
        .map_err(|_| error!(LendingError::CalculationError))?;
    
    let sb_val: f64 = sb_result.try_into()
        .map_err(|_| error!(LendingError::CalculationError))?;

    // Return the average price in 6 decimal places as u64
    Ok(((pyth_val + sb_val) / 2.0 * 1_000_000.0) as u64)
}
