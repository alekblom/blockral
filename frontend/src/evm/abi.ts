// Human-readable ABIs for ethers v6

export const FACTORY_ABI = [
  'function createProgram(string _name, uint16 _commissionBps, uint16 _platformFeeBps, address _platformWallet, address _verificationAuthority) returns (address program)',
  'function predictAddress(address _creator, string _name) view returns (address)',
  'function implementation() view returns (address)',
  'event ProgramCreated(address indexed programAddress, address indexed creator, string name)',
];

export const PROGRAM_ABI = [
  'function name() view returns (string)',
  'function creator() view returns (address)',
  'function referrerCommissionBps() view returns (uint16)',
  'function platformFeeBps() view returns (uint16)',
  'function platformWallet() view returns (address)',
  'function verificationAuthority() view returns (address)',
  'function active() view returns (bool)',
  'function createdAt() view returns (uint256)',
  'function totalReferrers() view returns (uint256)',
  'function getReferrerList() view returns (address[])',
  'function links(address) view returns (address referrer, uint256 totalReceived, uint256 referrerClaimed, uint256 ownerClaimed, uint256 platformClaimed, uint256 paymentCount, uint256 createdAt)',
  'function getLinkBalance(address) view returns (uint256)',
  'function joinProgram()',
  'function pay(address _referrer) payable',
  'function distribute(address _referrer)',
  'function pause()',
  'function resume()',
  'event ProgramCreated(string name, address indexed creator, uint16 commissionBps)',
  'event ReferrerJoined(address indexed referrer, address indexed program)',
  'event PaymentReceived(address indexed referrer, address indexed payer, uint256 amount)',
  'event Distributed(address indexed referrer, uint256 ownerAmount, uint256 referrerAmount, uint256 platformAmount)',
  'event ProgramPaused(address indexed creator)',
  'event ProgramResumed(address indexed creator)',
];
