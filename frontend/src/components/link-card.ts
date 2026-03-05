import { truncateAddress, formatSol, formatDate } from '../utils/format';
import { showToast } from './toast';
import type { ReferralLinkData } from '../types';

export function createLinkCard(
  link: ReferralLinkData,
  actions?: { onDistribute?: () => void; onClaim?: () => void },
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'link-card';

  card.innerHTML = `
    <div class="link-card-header">
      <div>
        <span class="link-card-label">Referral Link</span>
        <span class="link-card-address" title="${link.address}">${truncateAddress(link.address, 6)}</span>
      </div>
      <button class="btn-sm btn-secondary copy-link-btn">Copy</button>
    </div>
    <div class="link-card-body">
      <div class="link-card-balance">
        <div class="link-card-balance-amount">${formatSol(link.balance)} SOL</div>
        <div class="link-card-balance-label">Current Balance</div>
      </div>
      <div class="link-card-stats">
        <div class="link-card-stat">
          <span class="link-card-stat-label">Referrer</span>
          <span class="link-card-stat-value text-mono">${truncateAddress(link.referrer, 4)}</span>
        </div>
        <div class="link-card-stat">
          <span class="link-card-stat-label">Total Received</span>
          <span class="link-card-stat-value">${formatSol(link.totalReceived)} SOL</span>
        </div>
        <div class="link-card-stat">
          <span class="link-card-stat-label">Referrer Earned</span>
          <span class="link-card-stat-value">${formatSol(link.referrerClaimed)} SOL</span>
        </div>
        <div class="link-card-stat">
          <span class="link-card-stat-label">Payments</span>
          <span class="link-card-stat-value">${link.paymentCount}</span>
        </div>
      </div>
    </div>
    <div class="link-card-actions">
      ${actions?.onDistribute ? '<button class="btn-primary btn-sm distribute-action">Distribute</button>' : ''}
      ${actions?.onClaim ? '<button class="btn-secondary btn-sm claim-action">Claim</button>' : ''}
    </div>
  `;

  card.querySelector('.copy-link-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(link.address);
    showToast('Link address copied!', 'info');
  });

  if (actions?.onDistribute) {
    card.querySelector('.distribute-action')?.addEventListener('click', actions.onDistribute);
  }

  if (actions?.onClaim) {
    card.querySelector('.claim-action')?.addEventListener('click', actions.onClaim);
  }

  return card;
}
