import { store } from '../state';
import { truncateAddress, formatSolFromSol } from '../utils/format';
import { showWalletModal } from '../wallet/ui';
import { disconnectWallet } from '../wallet/adapter';
import { navigate, updateActiveNav } from '../router';
import { $ } from '../utils/dom';

export function createNav(): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'nav';

  nav.innerHTML = `
    <div class="nav-inner">
      <a href="#/" class="nav-brand">
        <span class="nav-brand-logo">B</span>
        <span>Blockral</span>
      </a>
      <div class="nav-links">
        <a href="#/" class="nav-link" data-route="/">Home</a>
        <a href="#/browse" class="nav-link" data-route="/browse">Browse</a>
        <a href="#/create" class="nav-link" data-route="/create">Create</a>
        <a href="#/my-programs" class="nav-link" data-route="/my-programs">My Programs</a>
        <a href="#/my-referrals" class="nav-link" data-route="/my-referrals">My Referrals</a>
      </div>
      <div class="nav-right">
        <button class="wallet-btn" id="nav-wallet-btn">Connect Wallet</button>
      </div>
    </div>
  `;

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
    const dropdown = document.createElement('div');
    dropdown.className = 'wallet-dropdown';
    dropdown.innerHTML = `
      <div class="wallet-balance">
        Balance: <strong>${balance !== null ? formatSolFromSol(balance) : '...'} SOL</strong>
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
      await disconnectWallet();
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

  return nav;
}
