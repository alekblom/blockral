import { $ } from '../utils/dom';
import { truncateAddress } from '../utils/format';
import { showToast } from './toast';
import { store } from '../state';
import { ICON_CLOSE } from '../icons';
import { getActiveChain, getNativeToken } from '../chain/manager';
import { isEvmChain } from '../evm/networks';

let modalEl: HTMLElement | null = null;

export function showTestPaymentModal(linkAddress: string, onSuccess?: () => void): void {
  if (modalEl) return;

  const token = getNativeToken();

  modalEl = document.createElement('div');
  modalEl.className = 'modal-backdrop';
  modalEl.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Test Payment</h2>
        <button class="modal-close" id="test-pay-close">${ICON_CLOSE}</button>
      </div>
      <div class="test-payment-form">
        <div class="test-payment-dest">
          <span class="text-muted">Destination</span>
          <code class="text-mono">${truncateAddress(linkAddress, 8)}</code>
        </div>
        <div class="test-payment-field">
          <label for="test-pay-amount">Amount (${token})</label>
          <input type="number" id="test-pay-amount" min="0.001" step="0.001" value="0.01" class="input" />
        </div>
        <button class="btn-primary" id="test-pay-send">Send Payment</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeTestPaymentModal();
  });

  $('#test-pay-close', modalEl)?.addEventListener('click', closeTestPaymentModal);

  $('#test-pay-send', modalEl)?.addEventListener('click', async () => {
    const amountInput = $('#test-pay-amount', modalEl!) as HTMLInputElement | null;
    if (!amountInput) return;

    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
      showToast(`Enter a valid ${token} amount`, 'error');
      return;
    }

    const pubkey = store.getState().wallet.publicKey;
    if (!pubkey) {
      showToast('Wallet not connected', 'error');
      return;
    }

    const sendBtn = $('#test-pay-send', modalEl!) as HTMLButtonElement | null;
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';
    }

    try {
      const chain = getActiveChain();

      if (isEvmChain(chain)) {
        const { pay } = await import('../evm/program');
        // On EVM, linkAddress is the referrer address, and we need the program address
        // For test payment we pay to the program with the referrer
        await pay(linkAddress, pubkey, amount.toString());
      } else if (chain === 'sui') {
        const { buildPayTx } = await import('../sui/program');
        const { signAndSendSuiTransaction } = await import('../chain/sui');
        const mist = Math.round(amount * 1e9);
        const tx = buildPayTx(linkAddress, linkAddress, mist);
        await signAndSendSuiTransaction(tx);
      } else {
        const { PublicKey } = await import('@solana/web3.js');
        const { buildTestPaymentTx } = await import('../solana/program');
        const { signAndSendTransaction } = await import('../wallet/adapter');

        const lamports = Math.round(amount * 1e9);
        const tx = buildTestPaymentTx(
          new PublicKey(pubkey),
          new PublicKey(linkAddress),
          lamports,
        );
        await signAndSendTransaction(tx);
      }

      showToast(`Sent ${amount} ${token} to referral link`, 'success');
      closeTestPaymentModal();
      onSuccess?.();
    } catch (err: any) {
      showToast(err.message || 'Payment failed', 'error');
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Payment';
      }
    }
  });
}

export function closeTestPaymentModal(): void {
  if (modalEl) {
    modalEl.remove();
    modalEl = null;
  }
}
