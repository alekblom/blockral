use anchor_lang::prelude::*;
use crate::error::BlockralError;
use crate::state::{ReferralProgram, ReferralLink};

#[derive(Accounts)]
pub struct JoinProgram<'info> {
    #[account(
        mut,
        seeds = [b"program", referral_program.creator.as_ref(), referral_program.name.as_ref()],
        bump = referral_program.bump,
        constraint = referral_program.active @ BlockralError::ProgramNotActive,
    )]
    pub referral_program: Account<'info, ReferralProgram>,

    #[account(
        init,
        payer = referrer,
        space = 8 + ReferralLink::INIT_SPACE,
        seeds = [b"link", referral_program.key().as_ref(), referrer.key().as_ref()],
        bump,
    )]
    pub referral_link: Account<'info, ReferralLink>,

    #[account(mut)]
    pub referrer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<JoinProgram>) -> Result<()> {
    let link = &mut ctx.accounts.referral_link;
    link.program = ctx.accounts.referral_program.key();
    link.referrer = ctx.accounts.referrer.key();
    link.bump = ctx.bumps.referral_link;
    link.total_received = 0;
    link.referrer_claimed = 0;
    link.owner_claimed = 0;
    link.platform_claimed = 0;
    link.payment_count = 0;

    let clock = Clock::get()?;
    link.created_at = clock.unix_timestamp;

    let program = &mut ctx.accounts.referral_program;
    program.total_referrers = program.total_referrers
        .checked_add(1)
        .ok_or(BlockralError::ArithmeticOverflow)?;
    program.updated_at = clock.unix_timestamp;

    msg!("Referrer {} joined program", ctx.accounts.referrer.key());
    Ok(())
}
