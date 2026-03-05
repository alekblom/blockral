import { store } from '../state';
import { navigate, getRouteParam } from '../router';
import { $ } from '../utils/dom';
import { truncateAddress, bpsToPercent, formatDate } from '../utils/format';
import { fetchProgramByAddress, buildJoinProgramTx } from '../solana/program';
import { signAndSendTransaction } from '../wallet/adapter';
import { showToast } from '../components/toast';
import { showWalletModal } from '../wallet/ui';
import { PLATFORM_FEE_BPS } from '../constants';
import { PublicKey } from '@solana/web3.js';

export function renderJoinProgram(outlet: HTMLElement): void {
  const programAddress = getRouteParam('/join/:address', 'address');
  if (!programAddress) {
    navigate('/browse');
    return;
  }

  outlet.innerHTML = `
    <div class="join-page fade-in">
      <div id="join-content">
        <div class="browse-loading">
          <div class="spinner" style="margin: 0 auto var(--space-4)"></div>
          <p class="text-muted">Loading program details...</p>
        </div>
      </div>
    </div>
  `;

  loadProgram();

  async function loadProgram(): Promise<void> {
    const content = $('#join-content', outlet)!;

    if (!store.getState().wallet.connected) {
      content.innerHTML = `
        <div class="join-card">
          <h1>Join Referral Program</h1>
          <p class="text-muted" style="margin-bottom: var(--space-6)">Connect your wallet to join this referral program and start earning.</p>
          <button class="btn-primary" id="join-connect">Connect Wallet</button>
        </div>
      `;
      $('#join-connect', content)?.addEventListener('click', () => {
        showWalletModal();
        const unsub = store.subscribe('wallet', (state) => {
          if (state.wallet.connected) {
            unsub();
            loadProgram();
          }
        });
      });
      return;
    }

    try {
      const program = await fetchProgramByAddress(programAddress!);
      if (!program) {
        content.innerHTML = `
          <div class="browse-empty">
            <h2>Program not found</h2>
            <button class="btn-secondary" id="back-browse">Browse Programs</button>
          </div>
        `;
        $('#back-browse', content)?.addEventListener('click', () => navigate('/browse'));
        return;
      }

      const commission = bpsToPercent(program.referrerCommissionBps);
      const platformFee = bpsToPercent(program.platformFeeBps);
      const ownerPct = 100 - commission - platformFee;

      content.innerHTML = `
        <div class="join-card">
          <h1>Join: ${program.name || 'Referral Program'}</h1>
          <div class="join-details">
            <div class="join-detail">
              <span class="join-detail-label">Creator</span>
              <span class="join-detail-value text-mono">${truncateAddress(program.creator, 6)}</span>
            </div>
            <div class="join-detail">
              <span class="join-detail-label">Your Commission</span>
              <span class="join-detail-value text-gradient" style="font-size: var(--font-size-2xl); font-weight: 700">${commission}%</span>
            </div>
            <div class="join-detail">
              <span class="join-detail-label">Owner Gets</span>
              <span class="join-detail-value">${ownerPct.toFixed(2)}%</span>
            </div>
            ${platformFee > 0 ? `
            <div class="join-detail">
              <span class="join-detail-label">Platform Fee</span>
              <span class="join-detail-value">${platformFee}%</span>
            </div>
            ` : ''}
            <div class="join-detail">
              <span class="join-detail-label">Status</span>
              <span class="badge ${program.active ? 'badge-success' : 'badge-warning'}">${program.active ? 'Active' : 'Paused'}</span>
            </div>
            <div class="join-detail">
              <span class="join-detail-label">Current Referrers</span>
              <span class="join-detail-value">${program.totalReferrers}</span>
            </div>
            <div class="join-detail">
              <span class="join-detail-label">Created</span>
              <span class="join-detail-value">${formatDate(program.createdAt)}</span>
            </div>
          </div>

          <div class="join-info">
            <p>By joining, you'll receive a unique payment address (PDA). Share this address with your audience.
            When someone pays to it, ${commission}% goes to you automatically.</p>
          </div>

          <div class="join-actions">
            <button class="btn-secondary" id="join-back">Back</button>
            <button class="btn-primary" id="join-confirm" ${!program.active ? 'disabled' : ''}>
              ${program.active ? 'Join Program' : 'Program is Paused'}
            </button>
          </div>
        </div>
      `;

      $('#join-back', content)?.addEventListener('click', () => {
        navigate(`/program/${programAddress}`);
      });

      $('#join-confirm', content)?.addEventListener('click', async () => {
        const btn = $('#join-confirm', content) as HTMLButtonElement;
        btn.disabled = true;
        btn.textContent = 'Joining...';

        try {
          const pubkey = store.getState().wallet.publicKey!;
          const { tx, linkAddress } = await buildJoinProgramTx(
            new PublicKey(programAddress!),
            new PublicKey(pubkey),
          );
          await signAndSendTransaction(tx);
          showToast('Joined! Your referral link address: ' + truncateAddress(linkAddress.toBase58(), 6), 'success');
          navigate('/my-referrals');
        } catch (err: any) {
          showToast(err.message || 'Failed to join program', 'error');
          btn.disabled = false;
          btn.textContent = 'Join Program';
        }
      });
    } catch (err: any) {
      content.innerHTML = `
        <div class="browse-empty">
          <h2>Error</h2>
          <p>${err.message || 'Failed to load program'}</p>
        </div>
      `;
    }
  }
}
