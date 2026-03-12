use anchor_lang::prelude::*;
use crate::error::BlockralError;
use crate::state::ReferralProgram;

#[derive(Accounts)]
#[instruction(name: [u8; 32])]
pub struct CreateProgram<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + ReferralProgram::INIT_SPACE,
        seeds = [b"program", creator.key().as_ref(), name.as_ref()],
        bump,
    )]
    pub referral_program: Account<'info, ReferralProgram>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateProgram>,
    name: [u8; 32],
    referrer_commission_bps: u16,
    platform_fee_bps: u16,
    platform_wallet: Pubkey,
    verification_authority: Pubkey,
) -> Result<()> {
    require!(name.iter().any(|&b| b != 0), BlockralError::EmptyName);
    require!(
        referrer_commission_bps >= 1 && referrer_commission_bps <= 5000,
        BlockralError::InvalidCommissionRate
    );
    require!(
        platform_fee_bps <= 1000,
        BlockralError::InvalidPlatformFee
    );

    if platform_fee_bps > 0 {
        require!(
            platform_wallet != Pubkey::default(),
            BlockralError::PlatformWalletRequired
        );
    }

    let program = &mut ctx.accounts.referral_program;
    program.creator = ctx.accounts.creator.key();
    program.name = name;
    program.bump = ctx.bumps.referral_program;
    program.referrer_commission_bps = referrer_commission_bps;
    program.platform_fee_bps = platform_fee_bps;
    program.platform_wallet = platform_wallet;
    program.verification_authority = verification_authority;
    program.total_payments = 0;
    program.total_referrers = 0;
    program.active = true;

    let clock = Clock::get()?;
    program.created_at = clock.unix_timestamp;
    program.updated_at = clock.unix_timestamp;

    msg!("Referral program created: commission={}bps, platform_fee={}bps",
        referrer_commission_bps, platform_fee_bps);
    Ok(())
}
