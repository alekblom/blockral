import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { IDL } from './idl';
import { PROGRAM_ID, PLATFORM_FEE_BPS, PLATFORM_WALLET } from '../constants';
import { getConnection, getActiveAdapter } from '../wallet/adapter';
import { deriveProgramPDA, deriveLinkPDA, nameToBytes, bytesToName } from './pda';
import { percentToBps } from '../utils/format';
import type { ReferralProgramData, ReferralLinkData } from '../types';

function getProgram(): Program {
  const connection = getConnection();
  const adapter = getActiveAdapter();
  if (!adapter || !adapter.publicKey) throw new Error('Wallet not connected');

  const provider = new AnchorProvider(
    connection,
    adapter as any,
    { commitment: 'confirmed' },
  );

  return new Program(IDL as any, provider);
}

export async function buildCreateProgramTx(
  creator: PublicKey,
  name: string,
  commissionPercent: number,
): Promise<{ tx: Transaction; programAddress: PublicKey }> {
  const program = getProgram();
  const nameBytes = nameToBytes(name);
  const [programPda] = deriveProgramPDA(creator, nameBytes);

  const platformFeeBps = PLATFORM_FEE_BPS;
  const platformWallet = PLATFORM_WALLET
    ? new PublicKey(PLATFORM_WALLET)
    : PublicKey.default;

  const ix = await program.methods
    .createProgram(
      Array.from(nameBytes),
      percentToBps(commissionPercent),
      platformFeeBps,
      platformWallet,
    )
    .accounts({
      referralProgram: programPda,
      creator: creator,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const tx = new Transaction().add(ix);
  return { tx, programAddress: programPda };
}

export async function buildJoinProgramTx(
  programPda: PublicKey,
  referrer: PublicKey,
): Promise<{ tx: Transaction; linkAddress: PublicKey }> {
  const program = getProgram();
  const [linkPda] = deriveLinkPDA(programPda, referrer);

  const ix = await program.methods
    .joinProgram()
    .accounts({
      referralProgram: programPda,
      referralLink: linkPda,
      referrer: referrer,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const tx = new Transaction().add(ix);
  return { tx, linkAddress: linkPda };
}

export async function buildDistributeTx(
  programPda: PublicKey,
  linkPda: PublicKey,
  owner: PublicKey,
  referrer: PublicKey,
  platformWallet: PublicKey,
  payer: PublicKey,
): Promise<Transaction> {
  const program = getProgram();

  const ix = await program.methods
    .distribute()
    .accounts({
      referralProgram: programPda,
      referralLink: linkPda,
      owner: owner,
      referrer: referrer,
      platform: platformWallet,
      payer: payer,
    })
    .instruction();

  return new Transaction().add(ix);
}

export async function buildClaimTx(
  programPda: PublicKey,
  linkPda: PublicKey,
  claimer: PublicKey,
): Promise<Transaction> {
  const program = getProgram();

  const ix = await program.methods
    .claim()
    .accounts({
      referralProgram: programPda,
      referralLink: linkPda,
      claimer: claimer,
    })
    .instruction();

  return new Transaction().add(ix);
}

export async function buildPauseProgramTx(
  programPda: PublicKey,
  creator: PublicKey,
  pause: boolean,
): Promise<Transaction> {
  const program = getProgram();

  const ix = await program.methods
    .pauseProgram(pause)
    .accounts({
      referralProgram: programPda,
      creator: creator,
    })
    .instruction();

  return new Transaction().add(ix);
}

export async function fetchAllPrograms(): Promise<ReferralProgramData[]> {
  const program = getProgram();
  const connection = getConnection();

  const accounts = await connection.getProgramAccounts(
    new PublicKey(PROGRAM_ID),
    {
      filters: [
        // ReferralProgram discriminator size check
        // 8 (discriminator) + 32 (creator) + 32 (name) + 1 (bump) + 2 (commission) + 2 (platform_fee) + 32 (platform_wallet) + 8 (total_payments) + 4 (total_referrers) + 1 (active) + 8 (created_at) + 8 (updated_at) = 138
        { dataSize: 8 + 32 + 32 + 1 + 2 + 2 + 32 + 8 + 4 + 1 + 8 + 8 },
      ],
    },
  );

  return accounts.map(({ pubkey, account }) => {
    try {
      const decoded = program.coder.accounts.decode('ReferralProgram', account.data);
      return {
        address: pubkey.toBase58(),
        creator: decoded.creator.toBase58(),
        name: bytesToName(decoded.name),
        referrerCommissionBps: decoded.referrerCommissionBps,
        platformFeeBps: decoded.platformFeeBps,
        platformWallet: decoded.platformWallet.toBase58(),
        totalPayments: decoded.totalPayments?.toNumber?.() || 0,
        totalReferrers: decoded.totalReferrers || 0,
        active: decoded.active,
        createdAt: decoded.createdAt?.toNumber?.() || 0,
        updatedAt: decoded.updatedAt?.toNumber?.() || 0,
      } as ReferralProgramData;
    } catch {
      return null;
    }
  }).filter(Boolean) as ReferralProgramData[];
}

export async function fetchProgramByAddress(address: string): Promise<ReferralProgramData | null> {
  const program = getProgram();
  try {
    const decoded = await (program.account as any).referralProgram.fetch(new PublicKey(address));
    return {
      address,
      creator: decoded.creator.toBase58(),
      name: bytesToName(decoded.name as any),
      referrerCommissionBps: decoded.referrerCommissionBps,
      platformFeeBps: decoded.platformFeeBps,
      platformWallet: decoded.platformWallet.toBase58(),
      totalPayments: (decoded.totalPayments as any)?.toNumber?.() || 0,
      totalReferrers: decoded.totalReferrers || 0,
      active: decoded.active,
      createdAt: (decoded.createdAt as any)?.toNumber?.() || 0,
      updatedAt: (decoded.updatedAt as any)?.toNumber?.() || 0,
    };
  } catch {
    return null;
  }
}

export async function fetchLinksForProgram(programPda: PublicKey): Promise<ReferralLinkData[]> {
  const program = getProgram();
  const connection = getConnection();

  const accounts = await connection.getProgramAccounts(
    new PublicKey(PROGRAM_ID),
    {
      filters: [
        // ReferralLink: 8 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 8 + 8 = 121
        { dataSize: 8 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 8 + 8 },
        {
          memcmp: {
            offset: 8, // after discriminator, first field is `program` pubkey
            bytes: programPda.toBase58(),
          },
        },
      ],
    },
  );

  return Promise.all(
    accounts.map(async ({ pubkey, account }) => {
      try {
        const decoded = program.coder.accounts.decode('ReferralLink', account.data);
        const balance = await connection.getBalance(pubkey);
        return {
          address: pubkey.toBase58(),
          program: decoded.program.toBase58(),
          referrer: decoded.referrer.toBase58(),
          totalReceived: (decoded.totalReceived as any)?.toNumber?.() || 0,
          referrerClaimed: (decoded.referrerClaimed as any)?.toNumber?.() || 0,
          ownerClaimed: (decoded.ownerClaimed as any)?.toNumber?.() || 0,
          platformClaimed: (decoded.platformClaimed as any)?.toNumber?.() || 0,
          paymentCount: (decoded.paymentCount as any)?.toNumber?.() || 0,
          createdAt: (decoded.createdAt as any)?.toNumber?.() || 0,
          balance,
        } as ReferralLinkData;
      } catch {
        return null;
      }
    }),
  ).then(results => results.filter(Boolean) as ReferralLinkData[]);
}

export async function fetchLinksForReferrer(referrerPubkey: PublicKey): Promise<ReferralLinkData[]> {
  const program = getProgram();
  const connection = getConnection();

  const accounts = await connection.getProgramAccounts(
    new PublicKey(PROGRAM_ID),
    {
      filters: [
        { dataSize: 8 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 8 + 8 },
        {
          memcmp: {
            offset: 8 + 32, // after discriminator + program pubkey, referrer field
            bytes: referrerPubkey.toBase58(),
          },
        },
      ],
    },
  );

  return Promise.all(
    accounts.map(async ({ pubkey, account }) => {
      try {
        const decoded = program.coder.accounts.decode('ReferralLink', account.data);
        const balance = await connection.getBalance(pubkey);
        return {
          address: pubkey.toBase58(),
          program: decoded.program.toBase58(),
          referrer: decoded.referrer.toBase58(),
          totalReceived: (decoded.totalReceived as any)?.toNumber?.() || 0,
          referrerClaimed: (decoded.referrerClaimed as any)?.toNumber?.() || 0,
          ownerClaimed: (decoded.ownerClaimed as any)?.toNumber?.() || 0,
          platformClaimed: (decoded.platformClaimed as any)?.toNumber?.() || 0,
          paymentCount: (decoded.paymentCount as any)?.toNumber?.() || 0,
          createdAt: (decoded.createdAt as any)?.toNumber?.() || 0,
          balance,
        } as ReferralLinkData;
      } catch {
        return null;
      }
    }),
  ).then(results => results.filter(Boolean) as ReferralLinkData[]);
}
