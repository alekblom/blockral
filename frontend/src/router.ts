import { store } from './state';

type RouteHandler = (outlet: HTMLElement) => (() => void) | void;

interface Route {
  path: string;
  render: RouteHandler;
  requiresWallet?: boolean;
}

const routes: Route[] = [];
let currentCleanup: (() => void) | null = null;
let outlet: HTMLElement | null = null;

export function registerRoute(path: string, render: RouteHandler, requiresWallet = false): void {
  routes.push({ path, render, requiresWallet });
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export function getCurrentPath(): string {
  return window.location.hash.slice(1) || '/';
}

function resolve(): void {
  if (!outlet) return;

  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const hash = getCurrentPath();

  // Try exact match first, then prefix match for parameterized routes
  let route = routes.find(r => r.path === hash);
  if (!route) {
    route = routes.find(r => r.path.includes(':') && matchRoute(r.path, hash));
  }

  if (!route) {
    navigate('/');
    return;
  }

  if (route.requiresWallet && !store.getState().wallet.connected) {
    navigate('/');
    return;
  }

  outlet.innerHTML = '';
  const cleanup = route.render(outlet);
  if (cleanup) currentCleanup = cleanup;
}

function matchRoute(pattern: string, path: string): boolean {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, i) => part.startsWith(':') || part === pathParts[i]);
}

export function getRouteParam(pattern: string, paramName: string): string | null {
  const hash = getCurrentPath();
  const patternParts = pattern.split('/');
  const pathParts = hash.split('/');
  if (patternParts.length !== pathParts.length) return null;
  const idx = patternParts.findIndex(p => p === `:${paramName}`);
  return idx >= 0 ? pathParts[idx] : null;
}

export function initRouter(el: HTMLElement): void {
  outlet = el;
  window.addEventListener('hashchange', resolve);
  resolve();
}

export function updateActiveNav(): void {
  const path = getCurrentPath();
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('data-route');
    if (href === path || (href && href !== '/' && path.startsWith(href))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}
