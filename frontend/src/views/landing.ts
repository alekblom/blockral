import { navigate } from '../router';
import { ICON_LOCK, ICON_BOLT, ICON_SEARCH, ICON_CHECK, ICON_SHIELD_CHECK, LOGO_HERO_SVG } from '../icons';

export function renderLanding(outlet: HTMLElement): void {
  outlet.innerHTML = `
    <div class="landing">
      <section class="hero">
        <div class="hero-content">
          <div class="hero-logo">${LOGO_HERO_SVG}</div>
          <div class="hero-badge">
            <span class="dot"></span>
            Multi-Chain Support
          </div>
          <h1>Web3 Referrals, <span class="text-gradient">On-Chain</span></h1>
          <p class="hero-subtitle">
            Trustless referral programs on Solana, Ethereum, Base, Polygon &amp; Sui. Immutable commission rates,
            instant payouts, fully transparent. No applications, no geo restrictions.
          </p>
          <div class="hero-actions">
            <button class="btn-primary" id="hero-cta">Create Referral Program</button>
            <button class="btn-secondary" id="hero-browse">Browse Programs</button>
          </div>
        </div>
      </section>

      <section class="features">
        <h2>Why <span class="text-gradient">Web3</span> Referrals?</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">${ICON_LOCK}</div>
            <h3>Immutable Terms</h3>
            <p>Commission rates are set on-chain. They can never be cut retroactively, unlike Web2 affiliate programs.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">${ICON_BOLT}</div>
            <h3>Instant Payouts</h3>
            <p>No net-30 payment terms, no minimums. Funds are split atomically through smart contracts.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">${ICON_SEARCH}</div>
            <h3>Fully Transparent</h3>
            <p>All payments are on-chain and publicly auditable. No disputes about tracking or attribution.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">${ICON_SHIELD_CHECK}</div>
            <h3>Verified Affiliates</h3>
            <p>Optionally gate programs to verified wallets only. Integrates with <a href="https://blockinity.com">Blockinity</a> for identity credentials.</p>
          </div>
        </div>
      </section>

      <section class="how-it-works">
        <h2>How It Works</h2>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <h3>Create Program</h3>
            <p>Product owner deploys a referral program with commission rate on any supported chain.</p>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <h3>Join & Share</h3>
            <p>Referrers join and get a unique payment address. Programs can be open or gated to verified affiliates.</p>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <h3>Earn & Distribute</h3>
            <p>Customers pay to the link. Anyone can trigger distribution &mdash; everyone gets their share.</p>
          </div>
        </div>
      </section>

      <section class="pricing">
        <div class="pricing-card">
          <div class="pricing-amount text-gradient">Free & Open Source</div>
          <div class="pricing-label">Self-host with zero fees, or use blockral.com ($1 one-time deploy fee, no ongoing fees)</div>
          <div class="pricing-features">
            <div class="pricing-feature">
              <span class="pricing-check">${ICON_CHECK}</span>
              <span>Unlimited referral programs</span>
            </div>
            <div class="pricing-feature">
              <span class="pricing-check">${ICON_CHECK}</span>
              <span>Customizable commission rates (0.01% - 50%)</span>
            </div>
            <div class="pricing-feature">
              <span class="pricing-check">${ICON_CHECK}</span>
              <span>On-chain smart contract enforcement</span>
            </div>
            <div class="pricing-feature">
              <span class="pricing-check">${ICON_CHECK}</span>
              <span>Push or pull distribution models</span>
            </div>
            <div class="pricing-feature">
              <span class="pricing-check">${ICON_CHECK}</span>
              <span>5 chains: Solana, Ethereum, Base, Polygon, Sui</span>
            </div>
            <div class="pricing-feature">
              <span class="pricing-check">${ICON_CHECK}</span>
              <span>Composable &mdash; other dApps can integrate</span>
            </div>
            <div class="pricing-feature">
              <span class="pricing-check">${ICON_CHECK}</span>
              <span>Optional affiliate verification via <a href="https://blockinity.com">Blockinity</a></span>
            </div>
          </div>
          <button class="btn-primary" id="pricing-cta" style="width: 100%">
            Get Started
          </button>
        </div>
      </section>

      <footer class="footer">
        <p>Blockral &mdash; Multi-Chain Referrals &mdash; A <a href="https://buidlings.com">Buidlings</a> product</p>
      </footer>
    </div>
  `;

  const handleCta = () => {
    const BA = (window as any).BuidlingsAuth;
    if (typeof BA !== 'undefined' && !BA.isLoggedIn()) {
      BA.login();
      const handler = () => {
        if (typeof BA !== 'undefined' && BA.isLoggedIn()) {
          window.removeEventListener('focus', handler);
          navigate('/create');
        }
      };
      window.addEventListener('focus', handler);
    } else {
      navigate('/create');
    }
  };

  outlet.querySelector('#hero-cta')?.addEventListener('click', handleCta);
  outlet.querySelector('#pricing-cta')?.addEventListener('click', handleCta);
  outlet.querySelector('#hero-browse')?.addEventListener('click', () => {
    navigate('/browse');
  });
}
