use anchor_lang::prelude::*;
use crate::error::BlockralError;
use crate::state::{ReferralProgram, ReferralLink};

#[derive(Accounts)]
pub struct Claim<'info> {
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

    #[account(mut)]
    pub claimer: Signer<'info>,
}

pub fn handler(ctx: Context<Claim>) -> Result<()> {
    let program = &ctx.accounts.referral_program;
    let link = &mut ctx.accounts.referral_link;
    let claimer_key = ctx.accounts.claimer.key();

    // Calculate distributable amount
    let rent = Rent::get()?;
    let rent_exempt = rent.minimum_balance(link.to_account_info().data_len());
    let current_lamports = link.to_account_info().lamports();

    let distributable = current_lamports
        .checked_sub(rent_exempt)
        .ok_or(BlockralError::InsufficientFunds)?;

    require!(distributable > 0, BlockralError::NothingToClaim);

    // Determine what the claimer is entitled to
    let is_referrer = claimer_key == link.referrer;
    let is_owner = claimer_key == program.creator;

    require!(is_referrer || is_owner, BlockralError::Unauthorized);

    // Calculate the claimer's share of the distributable amount
    let claim_amount = if is_referrer {
        (distributable as u128)
            .checked_mul(program.referrer_commission_bps as u128)
            .ok_or(BlockralError::ArithmeticOverflow)?
            .checked_div(10_000u128)
            .ok_or(BlockralError::ArithmeticOverflow)? as u64
    } else {
        // Owner gets remainder after referrer and platform
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

        distributable
            .checked_sub(referrer_share)
            .ok_or(BlockralError::ArithmeticOverflow)?
            .checked_sub(platform_share)
            .ok_or(BlockralError::ArithmeticOverflow)?
    };

    require!(claim_amount > 0, BlockralError::NothingToClaim);

    // Ensure we don't go below rent-exempt
    let available = current_lamports
        .checked_sub(rent_exempt)
        .ok_or(BlockralError::InsufficientFunds)?;
    let transfer_amount = claim_amount.min(available);
    require!(transfer_amount > 0, BlockralError::NothingToClaim);

    // Transfer
    **link.to_account_info().try_borrow_mut_lamports()? -= transfer_amount;
    **ctx.accounts.claimer.to_account_info().try_borrow_mut_lamports()? += transfer_amount;

    // Update accounting
    if is_referrer {
        link.referrer_claimed = link.referrer_claimed
            .checked_add(transfer_amount)
            .ok_or(BlockralError::ArithmeticOverflow)?;
    } else {
        link.owner_claimed = link.owner_claimed
            .checked_add(transfer_amount)
            .ok_or(BlockralError::ArithmeticOverflow)?;
    }
    link.total_received = link.total_received
        .checked_add(transfer_amount)
        .ok_or(BlockralError::ArithmeticOverflow)?;

    msg!("Claimed {} lamports for {}", transfer_amount, claimer_key);
    Ok(())
}
