// Stub IDL - will be replaced with generated IDL after `anchor build`
export const IDL = {
  version: '0.1.0',
  name: 'blockral',
  instructions: [
    {
      name: 'createProgram',
      accounts: [
        { name: 'referralProgram', isMut: true, isSigner: false },
        { name: 'creator', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'name', type: { array: ['u8', 32] } },
        { name: 'referrerCommissionBps', type: 'u16' },
        { name: 'platformFeeBps', type: 'u16' },
        { name: 'platformWallet', type: 'publicKey' },
        { name: 'verificationAuthority', type: 'publicKey' },
      ],
    },
    {
      name: 'joinProgram',
      accounts: [
        { name: 'referralProgram', isMut: true, isSigner: false },
        { name: 'referralLink', isMut: true, isSigner: false },
        { name: 'referrer', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'distribute',
      accounts: [
        { name: 'referralProgram', isMut: false, isSigner: false },
        { name: 'referralLink', isMut: true, isSigner: false },
        { name: 'owner', isMut: true, isSigner: false },
        { name: 'referrer', isMut: true, isSigner: false },
        { name: 'platform', isMut: true, isSigner: false },
        { name: 'payer', isMut: true, isSigner: true },
      ],
      args: [],
    },
    {
      name: 'claim',
      accounts: [
        { name: 'referralProgram', isMut: false, isSigner: false },
        { name: 'referralLink', isMut: true, isSigner: false },
        { name: 'claimer', isMut: true, isSigner: true },
      ],
      args: [],
    },
    {
      name: 'pauseProgram',
      accounts: [
        { name: 'referralProgram', isMut: true, isSigner: false },
        { name: 'creator', isMut: true, isSigner: true },
      ],
      args: [
        { name: 'pause', type: 'bool' },
      ],
    },
    {
      name: 'closeLink',
      accounts: [
        { name: 'referralProgram', isMut: true, isSigner: false },
        { name: 'referralLink', isMut: true, isSigner: false },
        { name: 'closer', isMut: true, isSigner: true },
      ],
      args: [],
    },
    {
      name: 'closeProgram',
      accounts: [
        { name: 'referralProgram', isMut: true, isSigner: false },
        { name: 'creator', isMut: true, isSigner: true },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'ReferralProgram',
      type: {
        kind: 'struct' as const,
        fields: [
          { name: 'creator', type: 'publicKey' },
          { name: 'name', type: { array: ['u8', 32] } },
          { name: 'bump', type: 'u8' },
          { name: 'referrerCommissionBps', type: 'u16' },
          { name: 'platformFeeBps', type: 'u16' },
          { name: 'platformWallet', type: 'publicKey' },
          { name: 'verificationAuthority', type: 'publicKey' },
          { name: 'totalPayments', type: 'u64' },
          { name: 'totalReferrers', type: 'u32' },
          { name: 'active', type: 'bool' },
          { name: 'createdAt', type: 'i64' },
          { name: 'updatedAt', type: 'i64' },
        ],
      },
    },
    {
      name: 'ReferralLink',
      type: {
        kind: 'struct' as const,
        fields: [
          { name: 'program', type: 'publicKey' },
          { name: 'referrer', type: 'publicKey' },
          { name: 'bump', type: 'u8' },
          { name: 'totalReceived', type: 'u64' },
          { name: 'referrerClaimed', type: 'u64' },
          { name: 'ownerClaimed', type: 'u64' },
          { name: 'platformClaimed', type: 'u64' },
          { name: 'paymentCount', type: 'u64' },
          { name: 'createdAt', type: 'i64' },
        ],
      },
    },
  ],
  types: [],
  errors: [
    { code: 6000, name: 'EmptyName', msg: 'Program name must not be empty' },
    { code: 6001, name: 'InvalidCommissionRate', msg: 'Commission rate must be between 1 and 5000 basis points (0.01% - 50%)' },
    { code: 6002, name: 'InvalidPlatformFee', msg: 'Platform fee must be between 0 and 1000 basis points (0% - 10%)' },
    { code: 6003, name: 'PlatformWalletRequired', msg: 'Platform wallet required when platform fee is set' },
    { code: 6004, name: 'ProgramNotActive', msg: 'Referral program is not active' },
    { code: 6005, name: 'AlreadyPaused', msg: 'Referral program is already paused' },
    { code: 6006, name: 'AlreadyActive', msg: 'Referral program is already active' },
    { code: 6007, name: 'NothingToClaim', msg: 'Nothing to claim' },
    { code: 6008, name: 'InsufficientFunds', msg: 'Insufficient funds in link account' },
    { code: 6009, name: 'Unauthorized', msg: 'Only the program creator can perform this action' },
    { code: 6010, name: 'ArithmeticOverflow', msg: 'Arithmetic overflow' },
    { code: 6011, name: 'LinkHasBalance', msg: 'Link account still has undistributed funds' },
    { code: 6012, name: 'ProgramHasLinks', msg: 'Program still has active referral links' },
    { code: 6013, name: 'VerificationRequired', msg: 'Referrer does not meet verification requirements' },
  ],
};

export type BlockralIDL = typeof IDL;
