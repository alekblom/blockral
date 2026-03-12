import { store } from '../state';
import { navigate } from '../router';
import { $ } from '../utils/dom';
import { validateProgramName, validateCommission } from '../utils/validation';
import { bpsToPercent, percentToBps } from '../utils/format';
import { showToast } from '../components/toast';
import { PLATFORM_FEE_BPS } from '../constants';
import { getActiveChain, getNativeToken, getExplorerUrl } from '../chain/manager';
import { isEvmChain } from '../evm/networks';

export function renderCreateProgram(outlet: HTMLElement): void {
  const state = store.getState();
  const token = getNativeToken();

  outlet.innerHTML = `
    <div class="create-page fade-in">
      <h1>Create Referral Program</h1>
      <p class="create-subtitle">Set up an on-chain referral program. Referrers will earn commission on every payment.</p>

      <div class="create-layout">
        <div class="create-form">
          <div class="form-group">
            <label>Program Name</label>
            <input class="input" type="text" id="program-name" placeholder="e.g. My SaaS Referral Program" maxlength="32" />
            <span class="form-hint" id="name-error"></span>
          </div>

          <div class="form-group">
            <label>Referrer Commission</label>
            <div class="commission-input">
              <input class="input" type="number" id="commission-percent" step="0.01" min="0.01" max="50" placeholder="10" />
              <span class="percent-suffix">%</span>
            </div>
            <span class="form-hint" id="commission-error"></span>
            <span class="form-hint text-muted">How much each referrer earns per payment (0.01% - 50%)</span>
          </div>

          ${PLATFORM_FEE_BPS > 0 ? `
          <div class="form-group">
            <label>Platform Fee</label>
            <div class="platform-fee-display">
              <span>${bpsToPercent(PLATFORM_FEE_BPS)}%</span>
              <span class="text-muted" style="font-size: var(--font-size-xs)">Applied automatically on blockral.com</span>
            </div>
          </div>
          ` : ''}

          <div class="form-group">
            <label>
              <input type="checkbox" id="require-verification" />
              Require affiliate verification
            </label>
            <span class="form-hint text-muted">Only verified wallets (via blockinity.com) can join as referrers</span>
          </div>

          <div class="form-group" id="verification-authority-group" style="display: none;">
            <label>Verification Authority</label>
            <input class="input input-mono" type="text" id="verification-authority" placeholder="Authority public key (e.g. blockinity.com program ID)" />
            <span class="form-hint text-muted">The public key of the credential authority that must have verified the referrer</span>
          </div>

          <div id="validation-errors" style="color: var(--color-error); font-size: var(--font-size-sm);"></div>

          <div class="create-actions">
            <button class="btn-primary" id="create-btn" disabled>
              Deploy Referral Program
            </button>
          </div>
        </div>

        <div class="create-sidebar">
          <div class="preview-card">
            <h3>Program Preview</h3>
            <div class="preview-split">
              <div class="preview-split-item">
                <div class="preview-split-bar" id="preview-owner-bar" style="width: 90%"></div>
                <div class="preview-split-label">
                  <span>Product Owner</span>
                  <span id="preview-owner-pct">90%</span>
                </div>
              </div>
              <div class="preview-split-item">
                <div class="preview-split-bar referrer" id="preview-referrer-bar" style="width: 10%"></div>
                <div class="preview-split-label">
                  <span>Referrer</span>
                  <span id="preview-referrer-pct">10%</span>
                </div>
              </div>
              ${PLATFORM_FEE_BPS > 0 ? `
              <div class="preview-split-item">
                <div class="preview-split-bar platform" id="preview-platform-bar" style="width: ${bpsToPercent(PLATFORM_FEE_BPS)}%"></div>
                <div class="preview-split-label">
                  <span>Platform</span>
                  <span id="preview-platform-pct">${bpsToPercent(PLATFORM_FEE_BPS)}%</span>
                </div>
              </div>
              ` : ''}
            </div>
            <div class="preview-example">
              <h4>Example: 1 ${token} payment</h4>
              <div class="preview-example-row">
                <span>Owner receives</span>
                <span id="preview-owner-sol">0.9000 ${token}</span>
              </div>
              <div class="preview-example-row">
                <span>Referrer earns</span>
                <span id="preview-referrer-sol">0.1000 ${token}</span>
              </div>
              ${PLATFORM_FEE_BPS > 0 ? `
              <div class="preview-example-row">
                <span>Platform fee</span>
                <span id="preview-platform-sol">${(bpsToPercent(PLATFORM_FEE_BPS) / 100).toFixed(4)} ${token}</span>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const nameInput = $('#program-name', outlet) as HTMLInputElement;
  const commissionInput = $('#commission-percent', outlet) as HTMLInputElement;
  const createBtn = $('#create-btn', outlet) as HTMLButtonElement;
  const verifyCheckbox = $('#require-verification', outlet) as HTMLInputElement;
  const verifyGroup = $('#verification-authority-group', outlet) as HTMLElement;
  const verifyInput = $('#verification-authority', outlet) as HTMLInputElement;

  verifyCheckbox.addEventListener('change', () => {
    verifyGroup.style.display = verifyCheckbox.checked ? 'block' : 'none';
    if (!verifyCheckbox.checked) verifyInput.value = '';
  });

  nameInput.value = state.createProgram.name;
  commissionInput.value = state.createProgram.commissionPercent.toString();

  function updatePreview(): void {
    const commission = parseFloat(commissionInput.value) || 0;
    const platformPct = bpsToPercent(PLATFORM_FEE_BPS);
    const ownerPct = Math.max(0, 100 - commission - platformPct);

    const ownerBar = $('#preview-owner-bar', outlet);
    const referrerBar = $('#preview-referrer-bar', outlet);
    if (ownerBar) ownerBar.style.width = `${ownerPct}%`;
    if (referrerBar) referrerBar.style.width = `${commission}%`;

    const ownerPctEl = $('#preview-owner-pct', outlet);
    const referrerPctEl = $('#preview-referrer-pct', outlet);
    if (ownerPctEl) ownerPctEl.textContent = `${ownerPct.toFixed(2)}%`;
    if (referrerPctEl) referrerPctEl.textContent = `${commission}%`;

    const ownerSol = $('#preview-owner-sol', outlet);
    const referrerSol = $('#preview-referrer-sol', outlet);
    if (ownerSol) ownerSol.textContent = `${(ownerPct / 100).toFixed(4)} ${token}`;
    if (referrerSol) referrerSol.textContent = `${(commission / 100).toFixed(4)} ${token}`;

    if (PLATFORM_FEE_BPS > 0) {
      const platformSol = $('#preview-platform-sol', outlet);
      if (platformSol) platformSol.textContent = `${(platformPct / 100).toFixed(4)} ${token}`;
    }
  }

  function validate(): boolean {
    const nameErr = validateProgramName(nameInput.value);
    const commissionErr = validateCommission(parseFloat(commissionInput.value) || 0);

    const nameErrEl = $('#name-error', outlet)!;
    const commErrEl = $('#commission-error', outlet)!;
    nameErrEl.textContent = nameErr || '';
    nameErrEl.style.color = nameErr ? 'var(--color-error)' : '';
    commErrEl.textContent = commissionErr || '';
    commErrEl.style.color = commissionErr ? 'var(--color-error)' : '';

    const valid = !nameErr && !commissionErr;
    createBtn.disabled = !valid;
    return valid;
  }

  nameInput.addEventListener('input', () => {
    store.update('createProgram', { name: nameInput.value });
    validate();
  });

  commissionInput.addEventListener('input', () => {
    store.update('createProgram', { commissionPercent: parseFloat(commissionInput.value) || 0 });
    validate();
    updatePreview();
  });

  createBtn.addEventListener('click', async () => {
    if (!validate()) return;

    // Ensure wallet is connected before deploying
    if (!store.getState().wallet.connected) {
      const { showWalletModal } = await import('../wallet/ui');
      showWalletModal();
      const unsub = store.subscribe('wallet', (state) => {
        if (state.wallet.connected) {
          unsub();
          createBtn.click(); // retry after connect
        }
      });
      return;
    }

    const pubkey = store.getState().wallet.publicKey;
    if (!pubkey) return;

    // Credit gate (skipped for self-hosted / open-source deployments)
    const BA = (window as any).BuidlingsAuth;
    if (typeof BA !== 'undefined') {
      if (!BA.isLoggedIn()) {
        showToast('Please sign in with your Buidlings account first', 'error');
        return;
      }

      createBtn.disabled = true;
      createBtn.textContent = 'Charging credits...';

      try {
        const deductResult = await BA.deduct('blockral_deploy');
        if (!deductResult.success) {
          showToast(`Insufficient credits. Need $1.00. Buy more at ${deductResult.buy_credits_url || 'alexiuz.com/credits'}`, 'error');
          createBtn.disabled = false;
          createBtn.textContent = 'Deploy Referral Program';
          return;
        }
      } catch (err: any) {
        showToast(err.message || 'Credit deduction failed', 'error');
        createBtn.disabled = false;
        createBtn.textContent = 'Deploy Referral Program';
        return;
      }
    }

    createBtn.disabled = true;
    createBtn.textContent = 'Deploying...';

    try {
      const chain = getActiveChain();

      if (isEvmChain(chain)) {
        const { createProgram } = await import('../evm/program');
        const { PLATFORM_WALLET: pw } = await import('../constants');

        const result = await createProgram(
          nameInput.value.trim(),
          percentToBps(parseFloat(commissionInput.value)),
          PLATFORM_FEE_BPS,
          pw || '0x0000000000000000000000000000000000000000',
          verifyCheckbox.checked && verifyInput.value.trim()
            ? verifyInput.value.trim()
            : '0x0000000000000000000000000000000000000000',
        );

        showToast('Referral program created!', 'success');
        navigate(`/program/${result.programAddress}`);
      } else if (chain === 'sui') {
        const { buildCreateProgramTx } = await import('../sui/program');
        const { signAndSendSuiTransaction } = await import('../chain/sui');
        const { PLATFORM_WALLET: pw } = await import('../constants');

        const tx = buildCreateProgramTx(
          nameInput.value.trim(),
          percentToBps(parseFloat(commissionInput.value)),
          PLATFORM_FEE_BPS,
          pw || '0x0',
          verifyCheckbox.checked && verifyInput.value.trim() ? verifyInput.value.trim() : '0x0',
        );

        const result = await signAndSendSuiTransaction(tx);
        showToast('Referral program created!', 'success');
        navigate('/browse');
      } else {
        const { PublicKey } = await import('@solana/web3.js');
        const { buildCreateProgramTx } = await import('../solana/program');
        const { signAndSendTransaction } = await import('../wallet/adapter');

        let verificationAuthority = PublicKey.default;
        if (verifyCheckbox.checked && verifyInput.value.trim()) {
          try {
            verificationAuthority = new PublicKey(verifyInput.value.trim());
          } catch {
            showToast('Invalid verification authority public key', 'error');
            createBtn.disabled = false;
            createBtn.textContent = 'Deploy Referral Program';
            return;
          }
        }

        const { tx, programAddress } = await buildCreateProgramTx(
          new PublicKey(pubkey),
          nameInput.value.trim(),
          parseFloat(commissionInput.value),
          verificationAuthority,
        );

        await signAndSendTransaction(tx);
        showToast('Referral program created!', 'success');
        navigate(`/program/${programAddress.toBase58()}`);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create program', 'error');
      createBtn.disabled = false;
      createBtn.textContent = 'Deploy Referral Program';
    }
  });

  validate();
  updatePreview();
}
