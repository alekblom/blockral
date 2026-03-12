import { BrowserProvider, JsonRpcSigner } from 'ethers';
import type { Eip1193Provider } from 'ethers';
import type { ChainWalletInfo } from './types';
import type { ChainId } from '../types';
import { store } from '../state';
import { showToast } from '../components/toast';
import { getEvmNetwork, isEvmChain } from '../evm/networks';

interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: Eip1193Provider;
}

interface EIP6963AnnounceEvent extends Event {
  detail: EIP6963ProviderDetail;
}

const detectedWallets: Map<string, EIP6963ProviderDetail> = new Map();
let eip6963Initialized = false;

let activeSigner: JsonRpcSigner | null = null;
let activeProvider: BrowserProvider | null = null;

export function initEvmWallet(): void {
  if (eip6963Initialized) return;
  eip6963Initialized = true;

  window.addEventListener('eip6963:announceProvider', (event: Event) => {
    const e = event as EIP6963AnnounceEvent;
    detectedWallets.set(e.detail.info.uuid, e.detail);
  });

  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

export function getEvmAvailableWallets(chain: ChainId): ChainWalletInfo[] {
  const wallets: ChainWalletInfo[] = [];

  for (const [, detail] of detectedWallets) {
    wallets.push({
      name: detail.info.name,
      icon: detail.info.icon,
      detected: true,
      chain,
    });
  }

  if (wallets.length === 0 && typeof window !== 'undefined' && (window as any).ethereum) {
    wallets.push({
      name: 'Browser Wallet',
      icon: '',
      detected: true,
      chain,
    });
  }

  return wallets;
}

export async function connectEvmWallet(walletName: string, chain: ChainId): Promise<void> {
  if (!isEvmChain(chain)) throw new Error(`Not an EVM chain: ${chain}`);

  let ethProvider: Eip1193Provider | null = null;

  for (const [, detail] of detectedWallets) {
    if (detail.info.name === walletName) {
      ethProvider = detail.provider;
      break;
    }
  }

  if (!ethProvider && (window as any).ethereum) {
    ethProvider = (window as any).ethereum;
  }

  if (!ethProvider) {
    showToast('EVM wallet not found', 'error');
    return;
  }

  try {
    activeProvider = new BrowserProvider(ethProvider);
    await activeProvider.send('eth_requestAccounts', []);
    await ensureCorrectChain(chain, ethProvider);

    activeProvider = new BrowserProvider(ethProvider);
    activeSigner = await activeProvider.getSigner();

    const address = await activeSigner.getAddress();

    store.update('wallet', {
      connected: true,
      publicKey: address,
      walletName,
    });

    await refreshEvmBalance();
    showToast(`Connected to ${walletName}`, 'success');

    if ((ethProvider as any).on) {
      (ethProvider as any).on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectEvmWallet();
        } else {
          store.update('wallet', { publicKey: accounts[0] });
          refreshEvmBalance();
        }
      });

      (ethProvider as any).on('chainChanged', () => {
        refreshEvmBalance();
      });
    }
  } catch (err: any) {
    showToast(err.message || 'Failed to connect EVM wallet', 'error');
  }
}

export function disconnectEvmWallet(): void {
  activeSigner = null;
  activeProvider = null;
  store.update('wallet', {
    connected: false,
    publicKey: null,
    walletName: null,
    balance: null,
  });
}

export async function refreshEvmBalance(): Promise<void> {
  const address = store.getState().wallet.publicKey;
  if (!address || !activeProvider) return;

  try {
    const balance = await activeProvider.getBalance(address);
    store.update('wallet', { balance: Number(balance) / 1e18 });
  } catch {
    // silently fail
  }
}

export function getEvmSigner(): JsonRpcSigner {
  if (!activeSigner) throw new Error('No EVM wallet connected');
  return activeSigner;
}

export function getEvmProvider(): BrowserProvider {
  if (!activeProvider) throw new Error('No EVM provider');
  return activeProvider;
}

async function ensureCorrectChain(chain: ChainId, ethProvider: Eip1193Provider): Promise<void> {
  const network = getEvmNetwork(chain);

  try {
    await (ethProvider as any).request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: network.chainIdHex }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await (ethProvider as any).request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: network.chainIdHex,
          chainName: network.chainName,
          nativeCurrency: network.nativeCurrency,
          rpcUrls: network.rpcUrls,
          blockExplorerUrls: network.blockExplorerUrls,
        }],
      });
    } else {
      throw switchError;
    }
  }
}
