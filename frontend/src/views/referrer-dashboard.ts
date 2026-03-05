import { store } from '../state';
import { navigate } from '../router';
import { $ } from '../utils/dom';
import { formatSol, truncateAddress, bpsToPercent } from '../utils/format';
import { fetchLinksForReferrer, fetchProgramByAddress, buildDistributeTx, buildClaimTx } from '../solana/program';
import { signAndSendTransaction } from '../wallet/adapter';
import { showToast } from '../components/toast';
import { createCopyButton } from '../components/copy-button';
import { EXPLORER_URL, SOLANA_NETWORK } from '../constants';
import { PublicKey } from '@solana/web3.js';
import type { ReferralLinkData, ReferralProgramData } from '../types';

interface LinkWithProgram {
  link: ReferralLinkData;
  program: ReferralProgramData | null;
}

export function renderReferrerDashboard(outlet: HTMLElement): (() => void) | void {
  outlet.innerHTML = `
    <div class="dashboard-page fade-in">
      <div class="dashboard-header">
        <h1>My Referrals</h1>
        <button class="btn-primary" id="browse-btn">Browse Programs</button>
      </div>
      <div class="dashboard-stats" id="referrer-stats"></div>
      <div id="referrer-content"></div>
    </div>
  `;

  $('#browse-btn', outlet)?.addEventListener('click', () => navigate('/browse'));

  loadLinks();
  const refreshInterval = setInterval(loadLinks, 30000);
  return () => clearInterval(refreshInterval);

  async function loadLinks(): Promise<void> {
    const pubkey = store.getState().wallet.publicKey;
    if (!pubkey) return;

    const content = $('#referrer-content', outlet)!;
    const stats = $('#referrer-stats', outlet)!;

    content.innerHTML = `
      <div class="browse-loading">
        <div class="spinner" style="margin: 0 auto var(--space-4)"></div>
        <p class="text-muted">Loading your referral links...</p>
      </div>
    `;

    try {
      const links = await fetchLinksForReferrer(new PublicKey(pubkey));

      // Fetch program data for each link
      const linksWithPrograms: LinkWithProgram[] = await Promise.all(
        links.map(async link => ({
          link,
          program: await fetchProgramByAddress(link.program),
        })),
      );

      // Stats
      const totalBalance = links.reduce((sum, l) => sum + l.balance, 0);
      const totalEarned = links.reduce((sum, l) => sum + l.referrerClaimed, 0);
      const totalPayments = links.reduce((sum, l) => sum + l.paymentCount, 0);

      stats.innerHTML = `
        <div class="stat-card">
          <div class="stat-label">Active Links</div>
          <div class="stat-value">${links.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pending Balance</div>
          <div class="stat-value">${formatSol(totalBalance)} SOL</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Earned</div>
          <div class="stat-value">${formatSol(totalEarned)} SOL</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Payments</div>
          <div class="stat-value">${totalPayments}</div>
        </div>
      `;

      if (links.length === 0) {
        content.innerHTML = `
          <div class="browse-empty">
            <h2>No referral links yet</h2>
            <p>Browse programs and join as a referrer to start earning.</p>
            <button class="btn-primary" id="empty-browse">Browse Programs</button>
          </div>
        `;
        $('#empty-browse', content)?.addEventListener('click', () => navigate('/browse'));
        return;
      }

      content.innerHTML = '<div class="dashboard-grid" id="links-grid"></div>';
      const grid = $('#links-grid', content)!;

      linksWithPrograms.forEach(({ link, program }) => {
        const card = document.createElement('div');
        card.className = 'referrer-link-card';

        const commission = program ? bpsToPercent(program.referrerCommissionBps) : 0;

        card.innerHTML = `
          <div class="link-card-header">
            <div>
              <span class="link-card-label">${program?.name || 'Unknown Program'}</span>
              <span class="badge ${program?.active ? 'badge-success' : 'badge-warning'}" style="margin-left: var(--space-2)">
                ${program?.active ? 'Active' : 'Paused'}
              </span>
            </div>
            <span class="text-gradient" style="font-weight: 700">${commission}%</span>
          </div>
          <div class="link-card-body">
            <div class="link-card-balance">
              <div class="link-card-balance-amount">${formatSol(link.balance)} SOL</div>
              <div class="link-card-balance-label">Pending Balance</div>
            </div>
            <div class="link-card-stats">
              <div class="link-card-stat">
                <span class="link-card-stat-label">Payment Address</span>
                <span class="link-card-stat-value text-mono">${truncateAddress(link.address, 6)}</span>
              </div>
              <div class="link-card-stat">
                <span class="link-card-stat-label">Total Earned</span>
                <span class="link-card-stat-value">${formatSol(link.referrerClaimed)} SOL</span>
              </div>
              <div class="link-card-stat">
                <span class="link-card-stat-label">Payments</span>
                <span class="link-card-stat-value">${link.paymentCount}</span>
              </div>
            </div>
          </div>
          <div class="link-card-actions" id="actions-${link.address}"></div>
        `;

        const actionsEl = card.querySelector(`#actions-${link.address}`)!;

        // Copy button
        actionsEl.appendChild(createCopyButton(link.address, 'Copy Address'));

        // Distribute button
        if (link.balance > 0 && program) {
          const distBtn = document.createElement('button');
          distBtn.className = 'btn-primary btn-sm';
          distBtn.textContent = 'Distribute';
          distBtn.addEventListener('click', () => handleDistribute(program, link));
          actionsEl.appendChild(distBtn);
        }

        // Claim button
        if (link.balance > 0) {
          const claimBtn = document.createElement('button');
          claimBtn.className = 'btn-secondary btn-sm';
          claimBtn.textContent = 'Claim';
          claimBtn.addEventListener('click', () => handleClaim(link));
          actionsEl.appendChild(claimBtn);
        }

        // Explorer link
        const explorerLink = document.createElement('a');
        explorerLink.href = `${EXPLORER_URL}/address/${link.address}?cluster=${SOLANA_NETWORK}`;
        explorerLink.target = '_blank';
        explorerLink.className = 'btn-secondary btn-sm';
        explorerLink.textContent = 'Explorer';
        actionsEl.appendChild(explorerLink);

        grid.appendChild(card);
      });
    } catch (err: any) {
      content.innerHTML = `
        <div class="browse-empty">
          <h2>Error loading links</h2>
          <p>${err.message || 'Failed to fetch data'}</p>
          <button class="btn-secondary" id="retry-load">Retry</button>
        </div>
      `;
      $('#retry-load', content)?.addEventListener('click', loadLinks);
    }
  }

  async function handleDistribute(program: ReferralProgramData, link: ReferralLinkData): Promise<void> {
    try {
      const pubkey = store.getState().wallet.publicKey!;
      const tx = await buildDistributeTx(
        new PublicKey(link.program),
        new PublicKey(link.address),
        new PublicKey(program.creator),
        new PublicKey(link.referrer),
        new PublicKey(program.platformWallet),
        new PublicKey(pubkey),
      );
      await signAndSendTransaction(tx);
      showToast('Funds distributed!', 'success');
      loadLinks();
    } catch (err: any) {
      showToast(err.message || 'Distribution failed', 'error');
    }
  }

  async function handleClaim(link: ReferralLinkData): Promise<void> {
    try {
      const pubkey = store.getState().wallet.publicKey!;
      const tx = await buildClaimTx(
        new PublicKey(link.program),
        new PublicKey(link.address),
        new PublicKey(pubkey),
      );
      await signAndSendTransaction(tx);
      showToast('Funds claimed!', 'success');
      loadLinks();
    } catch (err: any) {
      showToast(err.message || 'Claim failed', 'error');
    }
  }
}
