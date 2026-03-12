import { store } from '../state';
import { truncateAddress, formatSolFromSol } from '../utils/format';
import { showWalletModal } from '../wallet/ui';
import { disconnectWallet } from '../wallet/adapter';
import { disconnectSuiWallet } from '../chain/sui';
import { disconnectEvmWallet } from '../chain/evm';
import { navigate, updateActiveNav } from '../router';
import { $ } from '../utils/dom';
import { LOGO_SVG } from '../icons';
import { createChainSelector } from './chain-selector';
import { getNativeToken } from '../chain/manager';
import { isEvmChain } from '../evm/networks';

export function createNav(): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'nav';

  nav.innerHTML = `
    <div class="nav-inner">
      <a href="#/" class="nav-brand">
        <span class="nav-brand-logo">${LOGO_SVG}</span>
        <span>Blockral</span>
      </a>
      <div class="nav-links">
        <a href="#/" class="nav-link" data-route="/">Home</a>
        <a href="#/browse" class="nav-link" data-route="/browse">Browse</a>
        <a href="#/create" class="nav-link" data-route="/create">Create</a>
        <a href="#/my-programs" class="nav-link" data-route="/my-programs">My Programs</a>
        <a href="#/my-referrals" class="nav-link" data-route="/my-referrals">My Referrals</a>
        <a href="#/docs" class="nav-link" data-route="/docs">Docs</a>
      </div>
      <div class="nav-right">
        <div id="nav-buidlings-auth" style="display:flex;align-items:center;gap:8px;font-size:0.85rem;"></div>
        <div id="nav-chain-selector"></div>
        <button class="wallet-btn" id="nav-wallet-btn">Connect Wallet</button>
      </div>
    </div>
  `;

  // Insert chain selector
  const selectorSlot = $('#nav-chain-selector', nav)!;
  selectorSlot.appendChild(createChainSelector());

  const walletBtn = $('#nav-wallet-btn', nav)!;
  let dropdownOpen = false;

  function updateWalletBtn(): void {
    const { connected, publicKey } = store.getState().wallet;
    if (connected && publicKey) {
      walletBtn.className = 'wallet-btn connected';
      walletBtn.textContent = truncateAddress(publicKey);
    } else {
      walletBtn.className = 'wallet-btn';
      walletBtn.textContent = 'Connect Wallet';
    }
    closeDropdown();
  }

  function closeDropdown(): void {
    const existing = $('.wallet-dropdown');
    if (existing) existing.remove();
    dropdownOpen = false;
  }

  function openDropdown(): void {
    const { balance, publicKey } = store.getState().wallet;
    const token = getNativeToken();
    const dropdown = document.createElement('div');
    dropdown.className = 'wallet-dropdown';
    dropdown.innerHTML = `
      <div class="wallet-balance">
        Balance: <strong>${balance !== null ? formatSolFromSol(balance) : '...'} ${token}</strong>
      </div>
      <button class="wallet-dropdown-item" id="dropdown-copy">
        Copy Address
      </button>
      <button class="wallet-dropdown-item" id="dropdown-programs">
        My Programs
      </button>
      <button class="wallet-dropdown-item" id="dropdown-referrals">
        My Referrals
      </button>
      <button class="wallet-dropdown-item" id="dropdown-disconnect" style="color: var(--color-error)">
        Disconnect
      </button>
    `;

    nav.appendChild(dropdown);
    dropdownOpen = true;

    $('#dropdown-copy', dropdown)?.addEventListener('click', () => {
      if (publicKey) navigator.clipboard.writeText(publicKey);
      closeDropdown();
    });

    $('#dropdown-programs', dropdown)?.addEventListener('click', () => {
      navigate('/my-programs');
      closeDropdown();
    });

    $('#dropdown-referrals', dropdown)?.addEventListener('click', () => {
      navigate('/my-referrals');
      closeDropdown();
    });

    $('#dropdown-disconnect', dropdown)?.addEventListener('click', async () => {
      closeDropdown();
      const currentChain = store.getState().wallet.chain;
      if (currentChain === 'sui') {
        await disconnectSuiWallet();
      } else if (isEvmChain(currentChain)) {
        disconnectEvmWallet();
      } else {
        await disconnectWallet();
      }
    });

    setTimeout(() => {
      document.addEventListener('click', function handler(e: Event) {
        if (!dropdown.contains(e.target as Node) && e.target !== walletBtn) {
          closeDropdown();
          document.removeEventListener('click', handler);
        }
      });
    }, 0);
  }

  walletBtn.addEventListener('click', () => {
    const { connected } = store.getState().wallet;
    if (connected) {
      if (dropdownOpen) closeDropdown();
      else openDropdown();
    } else {
      showWalletModal();
    }
  });

  store.subscribe('wallet', updateWalletBtn);
  window.addEventListener('hashchange', updateActiveNav);

  // Buidlings auth UI
  const authSlot = $('#nav-buidlings-auth', nav)!;
  function updateBuidlingsAuth(): void {
    const BA = (window as any).BuidlingsAuth;
    if (typeof BA === 'undefined') { authSlot.innerHTML = ''; return; }
    if (BA.isLoggedIn()) {
      const user = BA.getUser();
      authSlot.innerHTML = `
        <span style="color:var(--color-text-muted)">${user?.email || 'User'}</span>
        <a href="#" id="nav-buy-credits" style="color:var(--color-primary);text-decoration:none;font-size:0.8rem">Credits</a>
        <a href="#" id="nav-logout-buidlings" style="color:var(--color-error);text-decoration:none;font-size:0.8rem">Sign Out</a>
      `;
      $('#nav-buy-credits', authSlot)?.addEventListener('click', (e) => { e.preventDefault(); window.open('https://alexiuz.com/credits', '_blank'); });
      $('#nav-logout-buidlings', authSlot)?.addEventListener('click', (e) => { e.preventDefault(); BA.logout(); updateBuidlingsAuth(); });
    } else {
      authSlot.innerHTML = `<a href="#" id="nav-signin-buidlings" style="color:var(--color-primary);text-decoration:none;font-weight:500">Sign In</a>`;
      $('#nav-signin-buidlings', authSlot)?.addEventListener('click', (e) => { e.preventDefault(); BA.login(); });
    }
  }
  updateBuidlingsAuth();
  window.addEventListener('focus', updateBuidlingsAuth);

  return nav;
}
