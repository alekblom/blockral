export const SOLANA_RPC_URL = 'https://api.devnet.solana.com';
export const SOLANA_NETWORK = 'devnet';
// Will be replaced with actual program ID after anchor deploy
export const PROGRAM_ID = 'BLKrALxxx1111111111111111111111111111111111';

// Platform fee configuration (via env vars for self-hosting)
export const PLATFORM_FEE_BPS = parseInt(import.meta.env.VITE_PLATFORM_FEE_BPS || '50', 10);
export const PLATFORM_WALLET = import.meta.env.VITE_PLATFORM_WALLET || '';

export const MAX_COMMISSION_BPS = 5000; // 50%
export const MIN_COMMISSION_BPS = 1;    // 0.01%

export const EXPLORER_URL = 'https://explorer.solana.com';

// Sui constants
export const SUI_NETWORK = 'testnet';
export const SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443';
export const SUI_EXPLORER_URL = 'https://suiscan.xyz/testnet';
export const SUI_PACKAGE_ID = '0x0'; // Replace after sui client publish

export const ACCENT_COLORS = [
  '#00d4aa', '#9945ff', '#14f195', '#ff6b6b', '#ffa502',
  '#1e90ff', '#ff79c6', '#bd93f9', '#8be9fd', '#f1fa8c',
];
