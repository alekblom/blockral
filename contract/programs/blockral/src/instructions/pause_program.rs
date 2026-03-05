use anchor_lang::prelude::*;
use crate::error::BlockralError;
use crate::state::ReferralProgram;

#[derive(Accounts)]
pub struct PauseProgram<'info> {
    #[account(
        mut,
        seeds = [b"program", referral_program.creator.as_ref(), referral_program.name.as_ref()],
        bump = referral_program.bump,
        has_one = creator @ BlockralError::Unauthorized,
    )]
    pub referral_program: Account<'info, ReferralProgram>,

    #[account(mut)]
    pub creator: Signer<'info>,
}

pub fn handler(ctx: Context<PauseProgram>, pause: bool) -> Result<()> {
    let program = &mut ctx.accounts.referral_program;

    if pause {
        require!(program.active, BlockralError::AlreadyPaused);
        program.active = false;
        msg!("Referral program paused");
    } else {
        require!(!program.active, BlockralError::AlreadyActive);
        program.active = true;
        msg!("Referral program resumed");
    }

    let clock = Clock::get()?;
    program.updated_at = clock.unix_timestamp;

    Ok(())
}
