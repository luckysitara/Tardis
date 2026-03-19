use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("9NbGsgPsvCCCQVKzxYG8tyU9XHJVvur2KtUFcKackL9t");

#[program]
pub mod sales_escrow {
    use super::*;

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        order_id: String,
        amount: u64,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_account;
        escrow.buyer = ctx.accounts.buyer.key();
        escrow.seller = ctx.accounts.seller.key();
        escrow.amount = amount;
        escrow.order_id = order_id;
        escrow.is_initialized = true;
        escrow.is_completed = false;
        escrow.bump = ctx.bumps.escrow_account;

        // Transfer funds from buyer to escrow vault
        let transfer_instruction = Transfer {
            from: ctx.accounts.buyer_token_account.to_account_info(),
            to: ctx.accounts.escrow_vault.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );

        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn confirm_delivery(ctx: Context<ConfirmDelivery>) -> Result<()> {
        let amount: u64;
        let bump: u8;
        let buyer_key: Pubkey;
        let order_id: String;

        {
            let escrow = &ctx.accounts.escrow_account;
            // Only buyer can confirm delivery
            require!(ctx.accounts.signer.key() == escrow.buyer, EscrowError::Unauthorized);
            require!(escrow.is_initialized, EscrowError::NotInitialized);
            require!(!escrow.is_completed, EscrowError::AlreadyCompleted);
            
            amount = escrow.amount;
            bump = escrow.bump;
            buyer_key = escrow.buyer;
            order_id = escrow.order_id.clone();
        }

        // Transfer funds from escrow vault to seller
        let seeds = &[
            b"escrow",
            buyer_key.as_ref(),
            order_id.as_bytes(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        let transfer_instruction = Transfer {
            from: ctx.accounts.escrow_vault.to_account_info(),
            to: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.escrow_account.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
            signer,
        );

        token::transfer(cpi_ctx, amount)?;

        let escrow = &mut ctx.accounts.escrow_account;
        escrow.is_completed = true;

        Ok(())
    }

    pub fn cancel_escrow(ctx: Context<CancelEscrow>) -> Result<()> {
        let amount: u64;
        let bump: u8;
        let buyer_key: Pubkey;
        let order_id: String;

        {
            let escrow = &ctx.accounts.escrow_account;
            // Only seller can cancel (refund buyer)
            require!(ctx.accounts.signer.key() == escrow.seller, EscrowError::Unauthorized);
            require!(escrow.is_initialized, EscrowError::NotInitialized);
            require!(!escrow.is_completed, EscrowError::AlreadyCompleted);

            amount = escrow.amount;
            bump = escrow.bump;
            buyer_key = escrow.buyer;
            order_id = escrow.order_id.clone();
        }

        // Transfer funds back to buyer
        let seeds = &[
            b"escrow",
            buyer_key.as_ref(),
            order_id.as_bytes(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        let transfer_instruction = Transfer {
            from: ctx.accounts.escrow_vault.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.escrow_account.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
            signer,
        );

        token::transfer(cpi_ctx, amount)?;

        let escrow = &mut ctx.accounts.escrow_account;
        escrow.is_completed = true;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(order_id: String)]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    /// CHECK: The seller's wallet address
    pub seller: AccountInfo<'info>,

    #[account(
        init,
        payer = buyer,
        space = 8 + 32 + 32 + 8 + 4 + order_id.len() + 1 + 1 + 1,
        seeds = [b"escrow", buyer.key().as_ref(), order_id.as_bytes()],
        bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = buyer,
        token::mint = mint,
        token::authority = escrow_account,
        seeds = [b"vault", escrow_account.key().as_ref()],
        bump
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    pub mint: Account<'info, token::Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ConfirmDelivery<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", escrow_account.buyer.as_ref(), escrow_account.order_id.as_bytes()],
        bump = escrow_account.bump,
        has_one = buyer,
        has_one = seller,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    /// CHECK: Validated by has_one
    pub buyer: AccountInfo<'info>,
    
    /// CHECK: Validated by has_one
    #[account(mut)]
    pub seller: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"vault", escrow_account.key().as_ref()],
        bump,
        token::authority = escrow_account,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelEscrow<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", escrow_account.buyer.as_ref(), escrow_account.order_id.as_bytes()],
        bump = escrow_account.bump,
        has_one = buyer,
        has_one = seller,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    /// CHECK: Validated by has_one
    #[account(mut)]
    pub buyer: AccountInfo<'info>,
    
    /// CHECK: Validated by has_one
    pub seller: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"vault", escrow_account.key().as_ref()],
        bump,
        token::authority = escrow_account,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct EscrowAccount {
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub amount: u64,
    pub order_id: String,
    pub is_initialized: bool,
    pub is_completed: bool,
    pub bump: u8,
}

#[error_code]
pub enum EscrowError {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
    #[msg("Escrow has not been initialized.")]
    NotInitialized,
    #[msg("Escrow has already been completed.")]
    AlreadyCompleted,
}
