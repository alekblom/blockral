import { ICON_CHECK, ICON_X, ICON_INFO } from '../icons';

let container: HTMLElement | null = null;

function ensureContainer(): HTMLElement {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(
  message: string,
  type: 'success' | 'error' | 'info' = 'info',
  duration = 5000,
): void {
  const c = ensureContainer();

  const icons: Record<string, string> = {
    success: ICON_CHECK,
    error: ICON_X,
    info: ICON_INFO,
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span>${message}</span>
  `;

  c.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
