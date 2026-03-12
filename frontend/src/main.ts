import './styles/fonts.css';
import './styles/variables.css';
import './styles/reset.css';
import './styles/components.css';
import './styles/nav.css';
import './styles/landing.css';
import './styles/create-program.css';
import './styles/browse.css';
import './styles/dashboard.css';
import './styles/wallet.css';
import './styles/docs.css';

import { initRouter, registerRoute, updateActiveNav } from './router';
import { initChains } from './chain/manager';
import { createNav } from './components/nav';
import { renderLanding } from './views/landing';
import { renderCreateProgram } from './views/create-program';
import { renderBrowsePrograms } from './views/browse-programs';
import { renderProgramDashboard } from './views/program-dashboard';
import { renderMyPrograms } from './views/my-programs';
import { renderReferrerDashboard } from './views/referrer-dashboard';
import { renderJoinProgram } from './views/join-program';
import { renderDocs } from './views/docs';

function bootstrap(): void {
  const app = document.getElementById('app')!;

  // Navigation
  app.appendChild(createNav());

  // Route outlet
  const outlet = document.createElement('main');
  outlet.id = 'route-outlet';
  app.appendChild(outlet);

  // Initialize wallet adapters for all chains
  initChains();

  // Register routes
  registerRoute('/', renderLanding);
  registerRoute('/create', renderCreateProgram, true);
  registerRoute('/browse', renderBrowsePrograms);
  registerRoute('/program/:address', renderProgramDashboard);
  registerRoute('/join/:address', renderJoinProgram);
  registerRoute('/my-programs', renderMyPrograms, true);
  registerRoute('/my-referrals', renderReferrerDashboard, true);
  registerRoute('/docs', renderDocs);

  // Start router
  initRouter(outlet);
  updateActiveNav();
}

document.addEventListener('DOMContentLoaded', bootstrap);
