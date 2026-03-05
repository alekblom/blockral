use anchor_lang::prelude::*;
use crate::error::BlockralError;
use crate::state::ReferralProgram;

#[derive(Accounts)]
pub struct CloseProgram<'info> {
    #[account(
        mut,
        seeds = [b"program", referral_program.creator.as_ref(), referral_program.name.as_ref()],
        bump = referral_program.bump,
        has_one = creator @ BlockralError::Unauthorized,
        close = creator,
    )]
    pub referral_program: Account<'info, ReferralProgram>,

    #[account(mut)]
    pub creator: Signer<'info>,
}

pub fn handler(ctx: Context<CloseProgram>) -> Result<()> {
    msg!("Referral program closed by {}", ctx.accounts.creator.key());
    Ok(())
}
