use anchor_lang::prelude::*;

#[error_code]
pub enum BlockralError {
    #[msg("Program name must not be empty")]
    EmptyName,

    #[msg("Commission rate must be between 1 and 5000 basis points (0.01% - 50%)")]
    InvalidCommissionRate,

    #[msg("Platform fee must be between 0 and 1000 basis points (0% - 10%)")]
    InvalidPlatformFee,

    #[msg("Platform wallet required when platform fee is set")]
    PlatformWalletRequired,

    #[msg("Referral program is not active")]
    ProgramNotActive,

    #[msg("Referral program is already paused")]
    AlreadyPaused,

    #[msg("Referral program is already active")]
    AlreadyActive,

    #[msg("Nothing to claim")]
    NothingToClaim,

    #[msg("Insufficient funds in link account")]
    InsufficientFunds,

    #[msg("Only the program creator can perform this action")]
    Unauthorized,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Link account still has undistributed funds")]
    LinkHasBalance,

    #[msg("Program still has active referral links")]
    ProgramHasLinks,
}
