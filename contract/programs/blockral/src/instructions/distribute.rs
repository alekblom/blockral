use anchor_lang::prelude::*;
use crate::error::BlockralError;
use crate::state::{ReferralProgram, ReferralLink};

#[derive(Accounts)]
pub struct Distribute<'info> {
    #[account(
        seeds = [b"program", referral_program.creator.as_ref(), referral_program.name.as_ref()],
        bump = referral_program.bump,
    )]
    pub referral_program: Account<'info, ReferralProgram>,

    #[account(
        mut,
        seeds = [b"link", referral_program.key().as_ref(), referral_link.referrer.as_ref()],
        bump = referral_link.bump,
        constraint = referral_link.program == referral_program.key(),
    )]
    pub referral_link: Account<'info, ReferralLink>,

    /// CHECK: Validated against referral_program.creator
    #[account(
        mut,
        constraint = owner.key() == referral_program.creator @ BlockralError::Unauthorized,
    )]
    pub owner: AccountInfo<'info>,

    /// CHECK: Validated against referral_link.referrer
    #[account(
        mut,
        constraint = referrer.key() == referral_link.referrer @ BlockralError::Unauthorized,
    )]
    pub referrer: AccountInfo<'info>,

    /// CHECK: Validated against referral_program.platform_wallet when fee > 0
    #[account(mut)]
    pub platform: AccountInfo<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
}

pub fn handler(ctx: Context<Distribute>) -> Result<()> {
    let program = &ctx.accounts.referral_program;
    let link = &ctx.accounts.referral_link;

    // Validate platform wallet if fee is set
    if program.platform_fee_bps > 0 {
        require!(
            ctx.accounts.platform.key() == program.platform_wallet,
            BlockralError::Unauthorized
        );
    }

    // Calculate distributable amount (excess above rent-exempt minimum)
    let rent = Rent::get()?;
    let rent_exempt = rent.minimum_balance(link.to_account_info().data_len());
    let current_lamports = link.to_account_info().lamports();

    let distributable = current_lamports
        .checked_sub(rent_exempt)
        .ok_or(BlockralError::InsufficientFunds)?;

    require!(distributable > 0, BlockralError::NothingToClaim);

    // Calculate shares
    let referrer_share = (distributable as u128)
        .checked_mul(program.referrer_commission_bps as u128)
        .ok_or(BlockralError::ArithmeticOverflow)?
        .checked_div(10_000u128)
        .ok_or(BlockralError::ArithmeticOverflow)? as u64;

    let platform_share = if program.platform_fee_bps > 0 {
        (distributable as u128)
            .checked_mul(program.platform_fee_bps as u128)
            .ok_or(BlockralError::ArithmeticOverflow)?
            .checked_div(10_000u128)
            .ok_or(BlockralError::ArithmeticOverflow)? as u64
    } else {
        0u64
    };

    let owner_share = distributable
        .checked_sub(referrer_share)
        .ok_or(BlockralError::ArithmeticOverflow)?
        .checked_sub(platform_share)
        .ok_or(BlockralError::ArithmeticOverflow)?;

    // Transfer lamports from link PDA
    let link = &mut ctx.accounts.referral_link;

    if referrer_share > 0 {
        **link.to_account_info().try_borrow_mut_lamports()? -= referrer_share;
        **ctx.accounts.referrer.try_borrow_mut_lamports()? += referrer_share;
    }

    if owner_share > 0 {
        **link.to_account_info().try_borrow_mut_lamports()? -= owner_share;
        **ctx.accounts.owner.try_borrow_mut_lamports()? += owner_share;
    }

    if platform_share > 0 {
        **link.to_account_info().try_borrow_mut_lamports()? -= platform_share;
        **ctx.accounts.platform.try_borrow_mut_lamports()? += platform_share;
    }

    // Update accounting
    link.total_received = link.total_received
        .checked_add(distributable)
        .ok_or(BlockralError::ArithmeticOverflow)?;
    link.referrer_claimed = link.referrer_claimed
        .checked_add(referrer_share)
        .ok_or(BlockralError::ArithmeticOverflow)?;
    link.owner_claimed = link.owner_claimed
        .checked_add(owner_share)
        .ok_or(BlockralError::ArithmeticOverflow)?;
    link.platform_claimed = link.platform_claimed
        .checked_add(platform_share)
        .ok_or(BlockralError::ArithmeticOverflow)?;
    link.payment_count = link.payment_count
        .checked_add(1)
        .ok_or(BlockralError::ArithmeticOverflow)?;

    msg!("Distributed {} lamports: owner={}, referrer={}, platform={}",
        distributable, owner_share, referrer_share, platform_share);
    Ok(())
}
