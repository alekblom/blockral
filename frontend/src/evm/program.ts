import { Contract, parseEther } from 'ethers';
import { getEvmSigner, getEvmProvider } from '../chain/evm';
import { getEvmNetwork } from './networks';
import { FACTORY_ABI, PROGRAM_ABI } from './abi';
import { getActiveChain } from '../chain/manager';
import type { ReferralProgramData, ReferralLinkData } from '../types';

function getFactory() {
  const chain = getActiveChain();
  const network = getEvmNetwork(chain);
  return new Contract(network.factoryAddress, FACTORY_ABI, getEvmSigner());
}

/**
 * Deploy a new referral program via the factory.
 */
export async function createProgram(
  name: string,
  commissionBps: number,
  platformFeeBps: number,
  platformWallet: string,
  verificationAuthority: string,
): Promise<{ txHash: string; programAddress: string }> {
  const factory = getFactory();
  const signer = getEvmSigner();
  const creator = await signer.getAddress();

  const predictedAddress = await factory.predictAddress(creator, name);
  const tx = await factory.createProgram(name, commissionBps, platformFeeBps, platformWallet, verificationAuthority);
  const receipt = await tx.wait();

  let programAddress = predictedAddress;
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed?.name === 'ProgramCreated') {
        programAddress = parsed.args.programAddress;
        break;
      }
    } catch { /* not a factory log */ }
  }

  return { txHash: receipt.hash, programAddress };
}

/**
 * Join a referral program as a referrer.
 */
export async function joinProgram(programAddress: string): Promise<string> {
  const program = new Contract(programAddress, PROGRAM_ABI, getEvmSigner());
  const tx = await program.joinProgram();
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Send a payment through a referral link.
 */
export async function pay(programAddress: string, referrer: string, amountEth: string): Promise<string> {
  const program = new Contract(programAddress, PROGRAM_ABI, getEvmSigner());
  const tx = await program.pay(referrer, { value: parseEther(amountEth) });
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Distribute a referral link's balance.
 */
export async function distribute(programAddress: string, referrer: string): Promise<string> {
  const program = new Contract(programAddress, PROGRAM_ABI, getEvmSigner());
  const tx = await program.distribute(referrer);
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Pause/resume a program.
 */
export async function togglePause(programAddress: string, currentlyActive: boolean): Promise<string> {
  const program = new Contract(programAddress, PROGRAM_ABI, getEvmSigner());
  const tx = currentlyActive ? await program.pause() : await program.resume();
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Fetch all programs created via the factory (by querying ProgramCreated events).
 */
export async function fetchAllPrograms(): Promise<ReferralProgramData[]> {
  const chain = getActiveChain();
  const network = getEvmNetwork(chain);
  const provider = getEvmProvider();

  const factory = new Contract(network.factoryAddress, FACTORY_ABI, provider);

  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 50000);
  const events = await factory.queryFilter(factory.filters.ProgramCreated(), fromBlock);

  const programs: ReferralProgramData[] = [];

  for (const event of events) {
    const parsed = factory.interface.parseLog({ topics: [...event.topics], data: event.data });
    if (!parsed) continue;

    try {
      const prog = await fetchProgramByAddress(parsed.args.programAddress);
      if (prog) programs.push(prog);
    } catch { /* skip */ }
  }

  return programs;
}

/**
 * Read a program's on-chain state.
 */
export async function fetchProgramByAddress(address: string): Promise<ReferralProgramData | null> {
  const provider = getEvmProvider();
  const program = new Contract(address, PROGRAM_ABI, provider);

  try {
    const [name, creator, commissionBps, platformFeeBps, platformWallet, verificationAuthority, active, createdAt, totalRefs] = await Promise.all([
      program.name(),
      program.creator(),
      program.referrerCommissionBps(),
      program.platformFeeBps(),
      program.platformWallet(),
      program.verificationAuthority(),
      program.active(),
      program.createdAt(),
      program.totalReferrers(),
    ]);

    return {
      address,
      creator,
      name,
      referrerCommissionBps: Number(commissionBps),
      platformFeeBps: Number(platformFeeBps),
      platformWallet,
      verificationAuthority,
      totalPayments: 0,
      totalReferrers: Number(totalRefs),
      active,
      createdAt: Number(createdAt),
      updatedAt: Number(createdAt),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch all referral links for a program.
 */
export async function fetchLinksForProgram(programAddress: string): Promise<ReferralLinkData[]> {
  const provider = getEvmProvider();
  const program = new Contract(programAddress, PROGRAM_ABI, provider);

  const referrerList: string[] = await program.getReferrerList();
  const links: ReferralLinkData[] = [];

  for (const referrer of referrerList) {
    try {
      const linkData = await program.links(referrer);
      const balance = await program.getLinkBalance(referrer);

      links.push({
        address: referrer, // On EVM, the referrer address IS the link identifier
        program: programAddress,
        referrer,
        totalReceived: Number(linkData.totalReceived),
        referrerClaimed: Number(linkData.referrerClaimed),
        ownerClaimed: Number(linkData.ownerClaimed),
        platformClaimed: Number(linkData.platformClaimed),
        paymentCount: Number(linkData.paymentCount),
        createdAt: Number(linkData.createdAt),
        balance: Number(balance),
      });
    } catch { /* skip */ }
  }

  return links;
}

/**
 * Fetch referral links where the given address is the referrer.
 */
export async function fetchLinksForReferrer(referrer: string): Promise<ReferralLinkData[]> {
  // To find all programs a referrer has joined, we query ReferrerJoined events
  const chain = getActiveChain();
  const network = getEvmNetwork(chain);
  const provider = getEvmProvider();

  const factory = new Contract(network.factoryAddress, FACTORY_ABI, provider);
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 50000);

  // First get all programs
  const programEvents = await factory.queryFilter(factory.filters.ProgramCreated(), fromBlock);
  const links: ReferralLinkData[] = [];

  for (const event of programEvents) {
    const parsed = factory.interface.parseLog({ topics: [...event.topics], data: event.data });
    if (!parsed) continue;

    const programAddress = parsed.args.programAddress;
    const program = new Contract(programAddress, PROGRAM_ABI, provider);

    try {
      const linkData = await program.links(referrer);
      if (Number(linkData.createdAt) === 0) continue; // Not joined

      const balance = await program.getLinkBalance(referrer);

      links.push({
        address: referrer,
        program: programAddress,
        referrer,
        totalReceived: Number(linkData.totalReceived),
        referrerClaimed: Number(linkData.referrerClaimed),
        ownerClaimed: Number(linkData.ownerClaimed),
        platformClaimed: Number(linkData.platformClaimed),
        paymentCount: Number(linkData.paymentCount),
        createdAt: Number(linkData.createdAt),
        balance: Number(balance),
      });
    } catch { /* skip */ }
  }

  return links;
}
