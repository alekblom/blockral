import { store } from '../state';
import { navigate } from '../router';
import { $ } from '../utils/dom';
import { createProgramCard } from '../components/program-card';
import { getActiveChain } from '../chain/manager';
import { isEvmChain } from '../evm/networks';

export function renderMyPrograms(outlet: HTMLElement): (() => void) | void {
  outlet.innerHTML = `
    <div class="dashboard-page fade-in">
      <div class="dashboard-header">
        <h1>My Programs</h1>
        <button class="btn-primary" id="new-program-btn">+ New Program</button>
      </div>
      <div class="dashboard-stats" id="owner-stats"></div>
      <div id="owner-content"></div>
    </div>
  `;

  $('#new-program-btn', outlet)?.addEventListener('click', () => navigate('/create'));

  loadPrograms();
  const refreshInterval = setInterval(loadPrograms, 30000);
  return () => clearInterval(refreshInterval);

  async function loadPrograms(): Promise<void> {
    const pubkey = store.getState().wallet.publicKey;
    if (!pubkey) {
      const content = $('#owner-content', outlet)!;
      content.innerHTML = `
        <div class="browse-loading" style="text-align:center;padding:var(--space-16)">
          <h2 style="margin-bottom:var(--space-4)">Connect your wallet</h2>
          <p class="text-muted" style="margin-bottom:var(--space-6)">Connect a wallet to view your referral programs.</p>
          <button class="btn-primary" id="programs-connect-wallet">Connect Wallet</button>
        </div>
      `;
      $('#programs-connect-wallet', content)?.addEventListener('click', async () => {
        const { showWalletModal } = await import('../wallet/ui');
        showWalletModal();
        const unsub = store.subscribe('wallet', (state) => {
          if (state.wallet.connected) { unsub(); loadPrograms(); }
        });
      });
      return;
    }

    const content = $('#owner-content', outlet)!;
    const stats = $('#owner-stats', outlet)!;

    content.innerHTML = `
      <div class="browse-loading">
        <div class="spinner" style="margin: 0 auto var(--space-4)"></div>
        <p class="text-muted">Loading your programs...</p>
      </div>
    `;

    try {
      let allPrograms;
      const chain = getActiveChain();
      if (isEvmChain(chain)) {
        const { fetchAllPrograms } = await import('../evm/program');
        allPrograms = await fetchAllPrograms();
      } else if (chain === 'sui') {
        const { fetchAllPrograms } = await import('../sui/program');
        allPrograms = await fetchAllPrograms();
      } else {
        const { fetchAllPrograms } = await import('../solana/program');
        allPrograms = await fetchAllPrograms();
      }

      const myPrograms = allPrograms.filter(p => p.creator === pubkey);

      const activeCount = myPrograms.filter(p => p.active).length;
      const totalReferrers = myPrograms.reduce((sum, p) => sum + p.totalReferrers, 0);

      stats.innerHTML = `
        <div class="stat-card">
          <div class="stat-label">Total Programs</div>
          <div class="stat-value">${myPrograms.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Active</div>
          <div class="stat-value">${activeCount}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Referrers</div>
          <div class="stat-value">${totalReferrers}</div>
        </div>
      `;

      if (myPrograms.length === 0) {
        content.innerHTML = `
          <div class="browse-empty">
            <h2>No programs yet</h2>
            <p>Create your first referral program to start getting referrers.</p>
            <button class="btn-primary" id="empty-create">Create Program</button>
          </div>
        `;
        $('#empty-create', content)?.addEventListener('click', () => navigate('/create'));
        return;
      }

      content.innerHTML = '<div class="browse-grid" id="programs-grid"></div>';
      const grid = $('#programs-grid', content)!;

      myPrograms
        .sort((a, b) => b.createdAt - a.createdAt)
        .forEach(prog => {
          grid.appendChild(createProgramCard(prog));
        });
    } catch (err: any) {
      content.innerHTML = `
        <div class="browse-empty">
          <h2>Error loading programs</h2>
          <p>${err.message || 'Failed to fetch data'}</p>
          <button class="btn-secondary" id="retry-load">Retry</button>
        </div>
      `;
      $('#retry-load', content)?.addEventListener('click', loadPrograms);
    }
  }
}
