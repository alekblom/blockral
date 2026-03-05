import { showToast } from './toast';

export function createCopyButton(text: string, label = 'Copy'): HTMLElement {
  const btn = document.createElement('button');
  btn.className = 'btn-secondary btn-sm copy-btn';
  btn.textContent = label;

  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(text);
    btn.textContent = 'Copied!';
    showToast('Copied to clipboard', 'info');
    setTimeout(() => {
      btn.textContent = label;
    }, 2000);
  });

  return btn;
}
