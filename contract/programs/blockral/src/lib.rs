use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("BLKrALxxx1111111111111111111111111111111111");

#[program]
pub mod blockral {
    use super::*;

    pub fn create_program(
        ctx: Context<CreateProgram>,
        name: [u8; 32],
        referrer_commission_bps: u16,
        platform_fee_bps: u16,
        platform_wallet: Pubkey,
        verification_authority: Pubkey,
    ) -> Result<()> {
        instructions::create_program::handler(ctx, name, referrer_commission_bps, platform_fee_bps, platform_wallet, verification_authority)
    }

    pub fn join_program(ctx: Context<JoinProgram>) -> Result<()> {
        instructions::join_program::handler(ctx)
    }

    pub fn distribute(ctx: Context<Distribute>) -> Result<()> {
        instructions::distribute::handler(ctx)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::claim::handler(ctx)
    }

    pub fn pause_program(ctx: Context<PauseProgram>, pause: bool) -> Result<()> {
        instructions::pause_program::handler(ctx, pause)
    }

    pub fn close_link(ctx: Context<CloseLink>) -> Result<()> {
        instructions::close_link::handler(ctx)
    }

    pub fn close_program(ctx: Context<CloseProgram>) -> Result<()> {
        instructions::close_program::handler(ctx)
    }
}
