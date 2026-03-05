import { truncateAddress, bpsToPercent, formatDate } from '../utils/format';
import { navigate } from '../router';
import type { ReferralProgramData } from '../types';

export function createProgramCard(program: ReferralProgramData): HTMLElement {
  const card = document.createElement('div');
  card.className = 'program-card';

  const commission = bpsToPercent(program.referrerCommissionBps);

  card.innerHTML = `
    <div class="program-card-header">
      <span class="program-card-name">${program.name || 'Unnamed Program'}</span>
      <span class="badge ${program.active ? 'badge-success' : 'badge-warning'}">
        ${program.active ? 'Active' : 'Paused'}
      </span>
    </div>
    <div class="program-card-body">
      <div class="program-card-stat">
        <span class="program-card-stat-label">Commission</span>
        <span class="program-card-stat-value text-gradient">${commission}%</span>
      </div>
      <div class="program-card-stat">
        <span class="program-card-stat-label">Referrers</span>
        <span class="program-card-stat-value">${program.totalReferrers}</span>
      </div>
      <div class="program-card-stat">
        <span class="program-card-stat-label">Creator</span>
        <span class="program-card-stat-value text-mono">${truncateAddress(program.creator, 4)}</span>
      </div>
    </div>
    <div class="program-card-footer">
      <span class="text-muted" style="font-size: var(--font-size-xs)">Created ${formatDate(program.createdAt)}</span>
      <button class="btn-secondary btn-sm program-card-view">View Details</button>
    </div>
  `;

  card.querySelector('.program-card-view')?.addEventListener('click', () => {
    navigate(`/program/${program.address}`);
  });

  return card;
}
