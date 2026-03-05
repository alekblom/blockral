import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '../constants';

export function deriveProgramPDA(
  creator: PublicKey,
  name: Uint8Array,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('program'), creator.toBuffer(), Buffer.from(name)],
    new PublicKey(PROGRAM_ID),
  );
}

export function deriveLinkPDA(
  programPda: PublicKey,
  referrer: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('link'), programPda.toBuffer(), referrer.toBuffer()],
    new PublicKey(PROGRAM_ID),
  );
}

export function nameToBytes(name: string): Uint8Array {
  const bytes = new Uint8Array(32);
  const encoded = new TextEncoder().encode(name.slice(0, 32));
  bytes.set(encoded);
  return bytes;
}

export function bytesToName(bytes: number[] | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const end = arr.indexOf(0);
  return new TextDecoder().decode(arr.slice(0, end === -1 ? arr.length : end));
}
