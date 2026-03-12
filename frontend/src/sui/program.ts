import { Transaction } from '@mysten/sui/transactions';
import { SUI_PACKAGE_ID, PLATFORM_FEE_BPS, PLATFORM_WALLET } from '../constants';
import { getSuiClient } from '../chain/sui';
import type { ReferralProgramData, ReferralLinkData } from '../types';

export function buildCreateProgramTx(
  name: string,
  commissionBps: number,
  platformFeeBps: number,
  platformWallet: string,
  verificationAuthority: string,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${SUI_PACKAGE_ID}::referral::create_program`,
    arguments: [
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(name))),
      tx.pure.u64(commissionBps),
      tx.pure.u64(platformFeeBps),
      tx.pure.address(platformWallet || '0x0'),
      tx.pure.address(verificationAuthority || '0x0'),
    ],
  });
  return tx;
}

export function buildJoinProgramTx(programObjectId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${SUI_PACKAGE_ID}::referral::join_program`,
    arguments: [tx.object(programObjectId)],
  });
  return tx;
}

export function buildPayTx(
  linkObjectId: string,
  programObjectId: string,
  amountMist: number,
): Transaction {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [amountMist]);
  tx.moveCall({
    target: `${SUI_PACKAGE_ID}::referral::pay`,
    arguments: [
      tx.object(linkObjectId),
      tx.object(programObjectId),
      coin,
    ],
  });
  return tx;
}

export function buildDistributeTx(
  programObjectId: string,
  linkObjectId: string,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${SUI_PACKAGE_ID}::referral::distribute`,
    arguments: [
      tx.object(programObjectId),
      tx.object(linkObjectId),
    ],
  });
  return tx;
}

export function buildClaimReferrerTx(
  programObjectId: string,
  linkObjectId: string,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${SUI_PACKAGE_ID}::referral::claim_referrer`,
    arguments: [
      tx.object(programObjectId),
      tx.object(linkObjectId),
    ],
  });
  return tx;
}

export function buildPauseProgramTx(
  capObjectId: string,
  programObjectId: string,
  pause: boolean,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${SUI_PACKAGE_ID}::referral::pause_program`,
    arguments: [
      tx.object(capObjectId),
      tx.object(programObjectId),
      tx.pure.bool(pause),
    ],
  });
  return tx;
}

export async function fetchAllPrograms(): Promise<ReferralProgramData[]> {
  const client = getSuiClient();

  const events = await client.queryEvents({
    query: { MoveEventType: `${SUI_PACKAGE_ID}::referral::ProgramCreated` },
    limit: 50,
  });

  if (events.data.length === 0) return [];

  const objectIds = events.data.map((e: any) => (e.parsedJson as any).program_id);
  const objects = await client.multiGetObjects({
    ids: objectIds,
    options: { showContent: true },
  });

  return objects
    .filter((obj: any) => obj.data?.content)
    .map((obj: any) => {
      const fields = obj.data.content.fields;
      return {
        address: obj.data.objectId,
        creator: fields.creator,
        name: decodeBytes(fields.name),
        referrerCommissionBps: Number(fields.commission_bps),
        platformFeeBps: Number(fields.platform_fee_bps),
        platformWallet: fields.platform_wallet,
        verificationAuthority: fields.verification_authority,
        totalPayments: Number(fields.total_payments),
        totalReferrers: Number(fields.total_referrers),
        active: fields.active,
        createdAt: Number(fields.created_at),
        updatedAt: 0,
      };
    });
}

export async function fetchProgramByAddress(address: string): Promise<ReferralProgramData | null> {
  const client = getSuiClient();
  try {
    const obj = await client.getObject({ id: address, options: { showContent: true } });
    if (!obj.data?.content) return null;
    const fields = (obj.data.content as any).fields;
    return {
      address,
      creator: fields.creator,
      name: decodeBytes(fields.name),
      referrerCommissionBps: Number(fields.commission_bps),
      platformFeeBps: Number(fields.platform_fee_bps),
      platformWallet: fields.platform_wallet,
      verificationAuthority: fields.verification_authority,
      totalPayments: Number(fields.total_payments),
      totalReferrers: Number(fields.total_referrers),
      active: fields.active,
      createdAt: Number(fields.created_at),
      updatedAt: 0,
    };
  } catch {
    return null;
  }
}

export async function fetchLinksForProgram(programId: string): Promise<ReferralLinkData[]> {
  const client = getSuiClient();

  const events = await client.queryEvents({
    query: { MoveEventType: `${SUI_PACKAGE_ID}::referral::LinkCreated` },
    limit: 100,
  });

  const linkEvents = events.data.filter((e: any) => (e.parsedJson as any).program_id === programId);
  if (linkEvents.length === 0) return [];

  const objectIds = linkEvents.map((e: any) => (e.parsedJson as any).link_id);
  const objects = await client.multiGetObjects({
    ids: objectIds,
    options: { showContent: true },
  });

  return objects
    .filter((obj: any) => obj.data?.content)
    .map((obj: any) => {
      const fields = obj.data.content.fields;
      return {
        address: obj.data.objectId,
        program: fields.program_id,
        referrer: fields.referrer,
        totalReceived: Number(fields.total_received),
        referrerClaimed: Number(fields.referrer_claimed),
        ownerClaimed: Number(fields.owner_claimed),
        platformClaimed: Number(fields.platform_claimed),
        paymentCount: Number(fields.payment_count),
        createdAt: Number(fields.created_at),
        balance: Number(fields.vault),
      };
    });
}

export async function fetchLinksForReferrer(referrer: string): Promise<ReferralLinkData[]> {
  const client = getSuiClient();

  const events = await client.queryEvents({
    query: { MoveEventType: `${SUI_PACKAGE_ID}::referral::LinkCreated` },
    limit: 100,
  });

  const linkEvents = events.data.filter((e: any) => (e.parsedJson as any).referrer === referrer);
  if (linkEvents.length === 0) return [];

  const objectIds = linkEvents.map((e: any) => (e.parsedJson as any).link_id);
  const objects = await client.multiGetObjects({
    ids: objectIds,
    options: { showContent: true },
  });

  return objects
    .filter((obj: any) => obj.data?.content)
    .map((obj: any) => {
      const fields = obj.data.content.fields;
      return {
        address: obj.data.objectId,
        program: fields.program_id,
        referrer: fields.referrer,
        totalReceived: Number(fields.total_received),
        referrerClaimed: Number(fields.referrer_claimed),
        ownerClaimed: Number(fields.owner_claimed),
        platformClaimed: Number(fields.platform_claimed),
        paymentCount: Number(fields.payment_count),
        createdAt: Number(fields.created_at),
        balance: Number(fields.vault),
      };
    });
}

function decodeBytes(bytes: number[] | string): string {
  if (typeof bytes === 'string') return bytes;
  return new TextDecoder().decode(new Uint8Array(bytes));
}
