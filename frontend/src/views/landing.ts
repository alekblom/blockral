import { store } from '../state';
import { navigate } from '../router';
import { showWalletModal } from '../wallet/ui';

export function renderLanding(outlet: HTMLElement): void {
  outlet.innerHTML = `
    <div class="landing">
      <section class="hero">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="dot"></span>
            Live on Solana Devnet
          </div>
          <h1>Web3 Referrals, <span class="text-gradient">On-Chain</span></h1>
          <p class="hero-subtitle">
            Trustless referral programs on Solana. Immutable commission rates,
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
            <div class="feature-icon">\u{1f512}</div>
            <h3>Immutable Terms</h3>
            <p>Commission rates are set on-chain. They can never be cut retroactively, unlike Web2 affiliate programs.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">\u26a1</div>
            <h3>Instant Payouts</h3>
            <p>No net-30 payment terms, no minimums. Funds are split atomically through smart contracts.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">\u{1f50d}</div>
            <h3>Fully Transparent</h3>
            <p>All payments are on-chain and publicly auditable. No disputes about tracking or attribution.</p>
          </div>
        </div>
      </section>

      <section class="how-it-works">
        <h2>How It Works</h2>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <h3>Create Program</h3>
            <p>Product owner sets up a referral program with commission rate on-chain.</p>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <h3>Join & Share</h3>
            <p>Referrers join permissionlessly and get a unique payment address (PDA).</p>
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
          <div class="pricing-label">Self-host with zero fees, or use blockral.com (0.5% platform fee)</div>
          <div class="pricing-features">
            <div class="pricing-feature">
              <span class="pricing-check">\u2713</span>
              <span>Unlimited referral programs</span>
            </div>
            <div class="pricing-feature">
              <span class="pricing-check">\u2713</span>
              <span>Customizable commission rates (0.01% - 50%)</span>
            </div>
            <div class="pricing-feature">
              <span class="pricing-check">\u2713</span>
              <span>On-chain smart contract enforcement</span>
            </div>
            <div class="pricing-feature">
              <span class="pricing-check">\u2713</span>
              <span>Push or pull distribution models</span>
            </div>
            <div class="pricing-feature">
              <span class="pricing-check">\u2713</span>
              <span>Composable &mdash; other dApps can integrate</span>
            </div>
          </div>
          <button class="btn-primary" id="pricing-cta" style="width: 100%">
            Get Started
          </button>
        </div>
      </section>

      <footer class="footer">
        <p>Blockral &mdash; Built on Solana &mdash; A <a href="https://buidlings.com">Buidlings</a> product</p>
      </footer>
    </div>
  `;

  const handleCta = () => {
    if (store.getState().wallet.connected) {
      navigate('/create');
    } else {
      showWalletModal();
      const unsub = store.subscribe('wallet', (state) => {
        if (state.wallet.connected) {
          unsub();
          navigate('/create');
        }
      });
    }
  };

  outlet.querySelector('#hero-cta')?.addEventListener('click', handleCta);
  outlet.querySelector('#pricing-cta')?.addEventListener('click', handleCta);
  outlet.querySelector('#hero-browse')?.addEventListener('click', () => {
    navigate('/browse');
  });
}
