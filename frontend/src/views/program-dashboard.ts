import { store } from '../state';
import { navigate, getRouteParam } from '../router';
import { $ } from '../utils/dom';
import { truncateAddress, bpsToPercent, formatSol, formatDate } from '../utils/format';
import {
  fetchProgramByAddress, fetchLinksForProgram,
  buildDistributeTx, buildPauseProgramTx,
  buildJoinProgramTx, buildClaimTx,
} from '../solana/program';
import { signAndSendTransaction } from '../wallet/adapter';
import { showToast } from '../components/toast';
import { createLinkCard } from '../components/link-card';
import { createCopyButton } from '../components/copy-button';
import { EXPLORER_URL, SOLANA_NETWORK } from '../constants';
import { PublicKey } from '@solana/web3.js';

export function renderProgramDashboard(outlet: HTMLElement): (() => void) | void {
  const programAddress = getRouteParam('/program/:address', 'address');
  if (!programAddress) {
    navigate('/browse');
    return;
  }

  outlet.innerHTML = `
    <div class="dashboard-page fade-in">
      <div id="program-header"></div>
      <div id="program-stats"></div>
      <div id="program-links"></div>
    </div>
  `;

  loadProgram();
  const refreshInterval = setInterval(loadProgram, 30000);
  return () => clearInterval(refreshInterval);

  async function loadProgram(): Promise<void> {
    const headerEl = $('#program-header', outlet)!;
    const statsEl = $('#program-stats', outlet)!;
    const linksEl = $('#program-links', outlet)!;

    if (!store.getState().wallet.connected) {
      headerEl.innerHTML = `
        <div class="browse-empty">
          <h2>Connect your wallet</h2>
          <p>Connect your wallet to view program details.</p>
        </div>
      `;
      return;
    }

    headerEl.innerHTML = `
      <div class="browse-loading">
        <div class="spinner" style="margin: 0 auto var(--space-4)"></div>
        <p class="text-muted">Loading program...</p>
      </div>
    `;

    try {
      const program = await fetchProgramByAddress(programAddress!);
      if (!program) {
        headerEl.innerHTML = `
          <div class="browse-empty">
            <h2>Program not found</h2>
            <button class="btn-secondary" id="back-browse">Back to Browse</button>
          </div>
        `;
        $('#back-browse', headerEl)?.addEventListener('click', () => navigate('/browse'));
        return;
      }

      const links = await fetchLinksForProgram(new PublicKey(programAddress!));
      const walletPubkey = store.getState().wallet.publicKey;
      const isOwner = walletPubkey === program.creator;
      const isReferrer = links.some(l => l.referrer === walletPubkey);

      // Header
      headerEl.innerHTML = `
        <div class="program-detail-header">
          <div>
            <h1>${program.name || 'Unnamed Program'}</h1>
            <div class="program-detail-meta">
              <span class="badge ${program.active ? 'badge-success' : 'badge-warning'}">
                ${program.active ? 'Active' : 'Paused'}
              </span>
              <span class="text-muted">by ${truncateAddress(program.creator, 6)}</span>
              <span class="text-muted">Created ${formatDate(program.createdAt)}</span>
            </div>
          </div>
          <div class="program-detail-actions">
            ${!isReferrer && !isOwner ? '<button class="btn-primary" id="join-btn">Join as Referrer</button>' : ''}
            ${isOwner ? `<button class="btn-secondary" id="pause-btn">${program.active ? 'Pause' : 'Resume'}</button>` : ''}
            <a href="${EXPLORER_URL}/address/${programAddress}?cluster=${SOLANA_NETWORK}" target="_blank" class="btn-secondary">Explorer</a>
          </div>
        </div>
      `;

      // Stats
      const totalBalance = links.reduce((sum, l) => sum + l.balance, 0);
      const totalDistributed = links.reduce((sum, l) => sum + l.totalReceived, 0);

      statsEl.innerHTML = `
        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-label">Commission Rate</div>
            <div class="stat-value">${bpsToPercent(program.referrerCommissionBps)}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Active Referrers</div>
            <div class="stat-value">${program.totalReferrers}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total in Links</div>
            <div class="stat-value">${formatSol(totalBalance)} SOL</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Distributed</div>
            <div class="stat-value">${formatSol(totalDistributed)} SOL</div>
          </div>
        </div>
      `;

      // Program address with copy
      const addrSection = document.createElement('div');
      addrSection.className = 'program-address-section';
      addrSection.innerHTML = `
        <span class="text-muted">Program Address: </span>
        <code class="text-mono">${truncateAddress(programAddress!, 8)}</code>
      `;
      addrSection.appendChild(createCopyButton(programAddress!));
      statsEl.appendChild(addrSection);

      // Links
      if (links.length === 0) {
        linksEl.innerHTML = `
          <div class="browse-empty" style="padding: var(--space-8)">
            <h2>No referral links yet</h2>
            <p>Referrers can join this program to get their unique payment addresses.</p>
          </div>
        `;
      } else {
        linksEl.innerHTML = `<h2 style="margin: var(--space-8) 0 var(--space-4)">Referral Links (${links.length})</h2>`;
        const grid = document.createElement('div');
        grid.className = 'dashboard-grid';

        links.forEach(link => {
          grid.appendChild(createLinkCard(link, {
            onDistribute: link.balance > 0 ? () => handleDistribute(program, link) : undefined,
            onClaim: (walletPubkey === link.referrer || isOwner) && link.balance > 0 ? () => handleClaim(link) : undefined,
          }));
        });

        linksEl.appendChild(grid);
      }

      // Event handlers
      $('#join-btn', headerEl)?.addEventListener('click', async () => {
        try {
          const pubkey = store.getState().wallet.publicKey!;
          const { tx, linkAddress } = await buildJoinProgramTx(
            new PublicKey(programAddress!),
            new PublicKey(pubkey),
          );
          await signAndSendTransaction(tx);
          showToast('Joined program! Your referral link is ready.', 'success');
          loadProgram();
        } catch (err: any) {
          showToast(err.message || 'Failed to join program', 'error');
        }
      });

      $('#pause-btn', headerEl)?.addEventListener('click', async () => {
        try {
          const pubkey = store.getState().wallet.publicKey!;
          const tx = await buildPauseProgramTx(
            new PublicKey(programAddress!),
            new PublicKey(pubkey),
            program.active,
          );
          await signAndSendTransaction(tx);
          showToast(program.active ? 'Program paused' : 'Program resumed', 'success');
          loadProgram();
        } catch (err: any) {
          showToast(err.message || 'Failed to update program', 'error');
        }
      });
    } catch (err: any) {
      headerEl.innerHTML = `
        <div class="browse-empty">
          <h2>Error loading program</h2>
          <p>${err.message || 'Failed to fetch data'}</p>
          <button class="btn-secondary" id="retry-load">Retry</button>
        </div>
      `;
      $('#retry-load', headerEl)?.addEventListener('click', loadProgram);
    }
  }

  async function handleDistribute(program: any, link: any): Promise<void> {
    try {
      const pubkey = store.getState().wallet.publicKey!;
      const tx = await buildDistributeTx(
        new PublicKey(programAddress!),
        new PublicKey(link.address),
        new PublicKey(program.creator),
        new PublicKey(link.referrer),
        new PublicKey(program.platformWallet),
        new PublicKey(pubkey),
      );
      await signAndSendTransaction(tx);
      showToast('Funds distributed!', 'success');
      loadProgram();
    } catch (err: any) {
      showToast(err.message || 'Distribution failed', 'error');
    }
  }

  async function handleClaim(link: any): Promise<void> {
    try {
      const pubkey = store.getState().wallet.publicKey!;
      const tx = await buildClaimTx(
        new PublicKey(programAddress!),
        new PublicKey(link.address),
        new PublicKey(pubkey),
      );
      await signAndSendTransaction(tx);
      showToast('Funds claimed!', 'success');
      loadProgram();
    } catch (err: any) {
      showToast(err.message || 'Claim failed', 'error');
    }
  }
}
