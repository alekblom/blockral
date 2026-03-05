use anchor_lang::prelude::*;
use crate::error::BlockralError;
use crate::state::{ReferralProgram, ReferralLink};

#[derive(Accounts)]
pub struct CloseLink<'info> {
    #[account(
        mut,
        seeds = [b"program", referral_program.creator.as_ref(), referral_program.name.as_ref()],
        bump = referral_program.bump,
    )]
    pub referral_program: Account<'info, ReferralProgram>,

    #[account(
        mut,
        seeds = [b"link", referral_program.key().as_ref(), referral_link.referrer.as_ref()],
        bump = referral_link.bump,
        constraint = referral_link.program == referral_program.key(),
        close = closer,
    )]
    pub referral_link: Account<'info, ReferralLink>,

    #[account(
        mut,
        constraint = closer.key() == referral_link.referrer || closer.key() == referral_program.creator @ BlockralError::Unauthorized,
    )]
    pub closer: Signer<'info>,
}

pub fn handler(ctx: Context<CloseLink>) -> Result<()> {
    let program = &mut ctx.accounts.referral_program;
    program.total_referrers = program.total_referrers.saturating_sub(1);

    let clock = Clock::get()?;
    program.updated_at = clock.unix_timestamp;

    msg!("Referral link closed by {}", ctx.accounts.closer.key());
    Ok(())
}
