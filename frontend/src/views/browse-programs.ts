import { store } from '../state';
import { $ } from '../utils/dom';
import { fetchAllPrograms } from '../solana/program';
import { createProgramCard } from '../components/program-card';
import { navigate } from '../router';

export function renderBrowsePrograms(outlet: HTMLElement): (() => void) | void {
  outlet.innerHTML = `
    <div class="browse-page fade-in">
      <div class="browse-header">
        <h1>Browse Referral Programs</h1>
        <button class="btn-primary" id="browse-create-btn">+ Create Program</button>
      </div>
      <div id="browse-content"></div>
    </div>
  `;

  $('#browse-create-btn', outlet)?.addEventListener('click', () => navigate('/create'));

  loadPrograms();

  const refreshInterval = setInterval(loadPrograms, 30000);
  return () => clearInterval(refreshInterval);

  async function loadPrograms(): Promise<void> {
    const content = $('#browse-content', outlet)!;

    if (!store.getState().wallet.connected) {
      content.innerHTML = `
        <div class="browse-empty">
          <h2>Connect your wallet</h2>
          <p>Connect your wallet to browse referral programs on-chain.</p>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <div class="browse-loading">
        <div class="spinner" style="margin: 0 auto var(--space-4)"></div>
        <p class="text-muted">Loading programs from Solana...</p>
      </div>
    `;

    try {
      const programs = await fetchAllPrograms();
      store.update('programs', { list: programs, loading: false });

      if (programs.length === 0) {
        content.innerHTML = `
          <div class="browse-empty">
            <h2>No programs yet</h2>
            <p>Be the first to create a referral program on Blockral.</p>
            <button class="btn-primary" id="empty-create">Create Program</button>
          </div>
        `;
        $('#empty-create', content)?.addEventListener('click', () => navigate('/create'));
        return;
      }

      content.innerHTML = `<div class="browse-grid" id="programs-grid"></div>`;
      const grid = $('#programs-grid', content)!;

      // Show active programs first, sorted by newest
      const sorted = [...programs].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return b.createdAt - a.createdAt;
      });

      sorted.forEach(prog => {
        grid.appendChild(createProgramCard(prog));
      });
    } catch (err: any) {
      content.innerHTML = `
        <div class="browse-empty">
          <h2>Error loading programs</h2>
          <p>${err.message || 'Failed to fetch data from Solana'}</p>
          <button class="btn-secondary" id="retry-load">Retry</button>
        </div>
      `;
      $('#retry-load', content)?.addEventListener('click', loadPrograms);
    }
  }
}
