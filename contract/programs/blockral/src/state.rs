use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ReferralProgram {
    pub creator: Pubkey,
    pub name: [u8; 32],
    pub bump: u8,
    pub referrer_commission_bps: u16,
    pub platform_fee_bps: u16,
    pub platform_wallet: Pubkey,
    pub total_payments: u64,
    pub total_referrers: u32,
    pub active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct ReferralLink {
    pub program: Pubkey,
    pub referrer: Pubkey,
    pub bump: u8,
    pub total_received: u64,
    pub referrer_claimed: u64,
    pub owner_claimed: u64,
    pub platform_claimed: u64,
    pub payment_count: u64,
    pub created_at: i64,
}
