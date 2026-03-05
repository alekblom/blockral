const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function isValidSolanaAddress(address: string): boolean {
  if (address.length < 32 || address.length > 44) return false;
  for (const char of address) {
    if (!BASE58_CHARS.includes(char)) return false;
  }
  return true;
}

export function validateProgramName(name: string): string | null {
  if (!name.trim()) return 'Program name is required';
  if (name.length > 32) return 'Program name must be 32 characters or less';
  return null;
}

export function validateCommission(percent: number): string | null {
  if (percent < 0.01) return 'Commission must be at least 0.01%';
  if (percent > 50) return 'Commission must be at most 50%';
  return null;
}
