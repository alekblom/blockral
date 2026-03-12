import { PROGRAM_ID } from '../constants';
import { showToast } from '../components/toast';

const SNIPPET_SOLANA_INTEGRATE = `import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";

// Blockral program ID (devnet)
const BLOCKRAL_PROGRAM_ID = new PublicKey("${PROGRAM_ID}");

/**
 * Derive the referral link PDA for a given program + referrer.
 * This PDA is also the payment address — send SOL directly to it.
 */
function deriveReferralLinkPDA(
  referralProgram: PublicKey,
  referrer: PublicKey,
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("link"), referralProgram.toBuffer(), referrer.toBuffer()],
    BLOCKRAL_PROGRAM_ID,
  );
  return pda;
}

/**
 * Build a SOL transfer instruction to a referral link PDA.
 * Compose this into your existing transaction for atomic rollback.
 */
function buildReferralPaymentIx(
  payer: PublicKey,
  referralProgram: PublicKey,
  referrer: PublicKey,
  lamports: number,
): TransactionInstruction {
  const linkPda = deriveReferralLinkPDA(referralProgram, referrer);
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: linkPda,
    lamports,
  });
}`;

const SNIPPET_EVM_INTEGRATE = `import { Contract, parseEther } from "ethers";

// Factory addresses (testnets — replace with mainnet after deployment)
const FACTORY_ADDRESSES = {
  sepolia:      "0x0000000000000000000000000000000000000000",
  baseSepolia:  "0x0000000000000000000000000000000000000000",
  polygonAmoy:  "0x0000000000000000000000000000000000000000",
};

// Referral Program ABI (minimal — only the functions you need)
const PROGRAM_ABI = [
  "function pay(address referrer) external payable",
  "function distribute(address referrer) external",
  "function joinProgram() external",
];

/**
 * Send a payment through a referral link on EVM.
 * The contract splits funds per the commission rate automatically.
 */
async function payReferral(
  signer: any,              // ethers Signer
  programAddress: string,   // deployed ReferralProgram clone
  referrer: string,         // referrer wallet address
  amountEth: string,        // e.g. "0.1"
) {
  const program = new Contract(programAddress, PROGRAM_ABI, signer);
  const tx = await program.pay(referrer, { value: parseEther(amountEth) });
  return await tx.wait();
}`;

const SNIPPET_COMPOSE = `// Example: Compose referral payment with an NFT mint (Solana)
const REFERRAL_PROGRAM = new PublicKey("YOUR_REFERRAL_PROGRAM_ADDRESS");
const referrer = new PublicKey("REFERRER_WALLET_ADDRESS");

const tx = new Transaction()
  .add(mintNftInstruction)              // your primary instruction
  .add(buildReferralPaymentIx(          // atomic referral payment
    buyer,                               // payer wallet
    REFERRAL_PROGRAM,                    // referral program PDA
    referrer,                            // who referred this buyer
    0.1 * 1e9,                          // 0.1 SOL in lamports
  ));

// If the mint fails (sold out, etc.), the referral payment
// is automatically rolled back. No orphaned payments.
await wallet.sendTransaction(tx, connection);`;

const SNIPPET_DISTRIBUTE = `import { Program, AnchorProvider } from "@coral-xyz/anchor";

// After SOL accumulates in a referral link PDA, anyone can
// call distribute() to split funds per the commission rate.

const ix = await program.methods
  .distribute()
  .accounts({
    referralProgram: programPda,     // the referral program
    referralLink: linkPda,           // the link PDA holding funds
    owner: ownerPubkey,              // program creator (receives remainder)
    referrer: referrerPubkey,        // referrer (receives commission)
    platform: platformPubkey,        // platform wallet (receives fee)
    payer: payerPubkey,              // tx fee payer (anyone)
  })
  .instruction();

const tx = new Transaction().add(ix);`;

const SNIPPET_EVM_DISTRIBUTE = `import { Contract } from "ethers";

// On EVM, anyone can call distribute() to split the link's
// accumulated balance according to the commission rate.

const PROGRAM_ABI = [
  "function distribute(address referrer) external",
];

const program = new Contract(programAddress, PROGRAM_ABI, signer);
const tx = await program.distribute(referrerAddress);
await tx.wait();`;

function createCodeBlock(code: string, lang: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'docs-code-wrapper';

  const header = document.createElement('div');
  header.className = 'docs-code-header';
  header.innerHTML = `<span>${lang}</span>`;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn-secondary btn-sm';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(code);
    showToast('Copied to clipboard', 'info');
  });
  header.appendChild(copyBtn);

  const pre = document.createElement('pre');
  pre.className = 'docs-code';
  const codeEl = document.createElement('code');
  codeEl.textContent = code;
  pre.appendChild(codeEl);

  wrapper.appendChild(header);
  wrapper.appendChild(pre);
  return wrapper;
}

export function renderDocs(outlet: HTMLElement): void {
  outlet.innerHTML = `
    <div class="docs-page fade-in">
      <div class="docs-header">
        <h1>Documentation</h1>
        <p class="docs-subtitle">Integrate Blockral referral payments into your dApp on Solana, Ethereum, Base, Polygon, or Sui.</p>
      </div>

      <div class="docs-toc">
        <h3>Contents</h3>
        <ul>
          <li><a href="#/docs" class="docs-toc-link" data-section="overview">Overview</a></li>
          <li><a href="#/docs" class="docs-toc-link" data-section="chains">Supported Chains</a></li>
          <li><a href="#/docs" class="docs-toc-link" data-section="how-it-works">How It Works</a></li>
          <li><a href="#/docs" class="docs-toc-link" data-section="integration-solana">Solana Integration</a></li>
          <li><a href="#/docs" class="docs-toc-link" data-section="integration-evm">EVM Integration</a></li>
          <li><a href="#/docs" class="docs-toc-link" data-section="composing">Composing Transactions</a></li>
          <li><a href="#/docs" class="docs-toc-link" data-section="distribution">Distribution &amp; Claims</a></li>
          <li><a href="#/docs" class="docs-toc-link" data-section="verification">Verified Affiliates</a></li>
          <li><a href="#/docs" class="docs-toc-link" data-section="accounts">Account Structure</a></li>
        </ul>
      </div>

      <section class="docs-section" id="section-overview">
        <h2>Overview</h2>
        <p>
          Blockral is a multi-chain, on-chain referral program protocol. Product owners create referral programs
          with immutable commission rates on any supported chain. Referrers join and receive a unique payment address.
          Programs can be fully permissionless or gated to verified
          affiliates via a verification authority (e.g. <a href="https://blockinity.com">Blockinity</a>).
          Customers pay to this address, and anyone can trigger
          distribution to split funds between the owner and referrer.
        </p>
        <p>
          On Solana, the key innovation is <strong>atomic composition</strong>: referral payments can be included in the
          same transaction as your primary instruction (e.g., NFT mint, token purchase). If the primary
          instruction fails, the referral payment is automatically rolled back.
          On EVM chains (Ethereum, Base, Polygon), payments go through a <code>pay()</code> function on the contract
          which records amounts and enables distribution.
        </p>
      </section>

      <section class="docs-section" id="section-chains">
        <h2>Supported Chains</h2>
        <div class="docs-table-wrapper">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Chain</th>
                <th>Testnet</th>
                <th>Native Token</th>
                <th>Contract Type</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Solana</strong></td>
                <td>Devnet</td>
                <td>SOL</td>
                <td>Anchor program (PDA-based)</td>
              </tr>
              <tr>
                <td><strong>Ethereum</strong></td>
                <td>Sepolia</td>
                <td>ETH</td>
                <td>EIP-1167 minimal proxy clone</td>
              </tr>
              <tr>
                <td><strong>Base</strong></td>
                <td>Base Sepolia</td>
                <td>ETH</td>
                <td>EIP-1167 minimal proxy clone</td>
              </tr>
              <tr>
                <td><strong>Polygon</strong></td>
                <td>Amoy</td>
                <td>POL</td>
                <td>EIP-1167 minimal proxy clone</td>
              </tr>
              <tr>
                <td><strong>Sui</strong></td>
                <td>Testnet</td>
                <td>SUI</td>
                <td>Move module</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="docs-callout">
          <strong>Architecture note:</strong> On EVM chains, each referral program is deployed as a minimal proxy clone
          (EIP-1167) via a factory contract. This keeps deployment gas low (~150k vs 1M+). All clones share the same
          implementation logic but have independent storage.
        </div>
      </section>

      <section class="docs-section" id="section-how-it-works">
        <h2>How It Works</h2>
        <div class="docs-steps">
          <div class="docs-step">
            <div class="docs-step-num">1</div>
            <div>
              <h3>Create a Referral Program</h3>
              <p>
                The product owner creates a program with a name and commission rate
                (1&ndash;5000 bps, i.e., 0.01%&ndash;50%). On Solana this creates a PDA;
                on EVM chains the factory deploys a minimal proxy clone; on Sui a shared object is created.
              </p>
            </div>
          </div>
          <div class="docs-step">
            <div class="docs-step-num">2</div>
            <div>
              <h3>Referrers Join</h3>
              <p>
                Wallets call <code>join_program</code> (Solana) or <code>joinProgram()</code> (EVM) to register
                as a referrer. On Solana this creates a PDA; on EVM the referrer's address is recorded in the contract.
                If the program requires verification, only attested wallets can join.
              </p>
            </div>
          </div>
          <div class="docs-step">
            <div class="docs-step-num">3</div>
            <div>
              <h3>Receive Payments</h3>
              <p>
                <strong>Solana:</strong> Customers send SOL directly to the referral link PDA via <code>SystemProgram.transfer</code>.<br>
                <strong>EVM:</strong> Customers call <code>pay(referrer)</code> on the program contract with ETH/POL value attached.
              </p>
            </div>
          </div>
          <div class="docs-step">
            <div class="docs-step-num">4</div>
            <div>
              <h3>Distribute Funds</h3>
              <p>
                Anyone can call <code>distribute</code> to split accumulated funds according to the
                commission rate. The referrer receives their commission, the owner receives the remainder
                minus the referrer's commission.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="docs-section" id="section-integration-solana">
        <h2>Solana Integration</h2>
        <p>
          To integrate Blockral on Solana, you need the referral program address and the referrer's wallet address
          (typically passed via a URL parameter like <code>?ref=WALLET_ADDRESS</code>).
        </p>
        <div id="code-solana-integrate"></div>
      </section>

      <section class="docs-section" id="section-integration-evm">
        <h2>EVM Integration (Ethereum / Base / Polygon)</h2>
        <p>
          On EVM chains, the referral program is a smart contract deployed via the factory. To send a payment
          through a referral link, call <code>pay(referrer)</code> with the ETH/POL value attached.
          The contract records the payment and enables distribution.
        </p>
        <div id="code-evm-integrate"></div>
        <div class="docs-callout">
          <strong>Factory pattern:</strong> Each program is deployed as an EIP-1167 minimal proxy clone.
          Use <code>factory.predictAddress(creator, name)</code> to compute the deterministic address
          before deployment, useful for pre-generating integration URLs.
        </div>
      </section>

      <section class="docs-section" id="section-composing">
        <h2>Composing Transactions (Solana)</h2>
        <p>
          On Solana, the real power of Blockral is atomic composition. Add the referral payment instruction to the same
          transaction as your primary operation. If any instruction fails, <em>all</em>
          instructions are rolled back &mdash; including the referral payment.
        </p>
        <div id="code-compose"></div>
        <div class="docs-callout">
          <strong>Why this matters:</strong> In traditional affiliate systems, if a purchase fails after the
          referral fee is paid, you need manual reconciliation. With Blockral, the payment only goes through
          if the entire transaction succeeds. This eliminates refund disputes and accounting overhead.
        </div>
      </section>

      <section class="docs-section" id="section-distribution">
        <h2>Distribution &amp; Claims</h2>
        <p>
          After funds accumulate in a referral link, they need to be distributed. The approach is similar across chains:
        </p>
        <h3>Solana</h3>
        <p>
          Anyone can call <code>distribute()</code> to split the entire PDA balance. Or the referrer/owner can call
          <code>claim()</code> to pull only their share.
        </p>
        <div id="code-distribute-solana"></div>
        <h3>EVM (Ethereum / Base / Polygon)</h3>
        <p>
          Call <code>distribute(referrer)</code> on the program contract. The contract transfers the referrer's
          commission and the owner's share in a single transaction.
        </p>
        <div id="code-distribute-evm"></div>
      </section>

      <section class="docs-section" id="section-verification">
        <h2>Verified Affiliates</h2>
        <p>
          By default, referral programs are <strong>permissionless</strong> &mdash; any wallet can join as a referrer.
          For programs that require quality control, owners can set a <code>verification_authority</code> when
          creating the program. This is a public key (Solana) or address (EVM) representing a credential authority
          (such as <a href="https://blockinity.com">Blockinity</a>) that must have verified the referrer's wallet.
        </p>
        <h3>How It Works</h3>
        <div class="docs-steps">
          <div class="docs-step">
            <div class="docs-step-num">1</div>
            <div>
              <h3>Set Verification Authority</h3>
              <p>
                When creating a program, pass a non-zero <code>verification_authority</code>.
                Set to zero address for permissionless programs.
              </p>
            </div>
          </div>
          <div class="docs-step">
            <div class="docs-step-num">2</div>
            <div>
              <h3>Referrer Gets Verified</h3>
              <p>
                The referrer verifies their wallet with the credential authority (e.g. signs a message on
                Blockinity to prove wallet ownership, links social accounts, etc.).
              </p>
            </div>
          </div>
          <div class="docs-step">
            <div class="docs-step-num">3</div>
            <div>
              <h3>Join Gated Program</h3>
              <p>
                When joining, the contract checks that the referrer has been
                attested by the required verification authority before allowing them to join.
              </p>
            </div>
          </div>
        </div>
        <div class="docs-callout">
          <strong>Integration:</strong> <a href="https://blockinity.com">Blockinity</a> provides wallet ownership
          verification today, with social metrics (X followers, GitHub activity) and website traffic verification
          coming soon. Use Blockinity's program ID as the <code>verification_authority</code> to gate your
          referral program to verified affiliates.
        </div>
      </section>

      <section class="docs-section" id="section-accounts">
        <h2>Account Structure</h2>
        <h3>Solana (Anchor PDAs)</h3>
        <div class="docs-table-wrapper">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Seeds</th>
                <th>Key Fields</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>ReferralProgram</code></td>
                <td><code>["program", creator, name]</code></td>
                <td>creator, name, commission_bps, platform_fee_bps, platform_wallet, verification_authority, active</td>
              </tr>
              <tr>
                <td><code>ReferralLink</code></td>
                <td><code>["link", program, referrer]</code></td>
                <td>program, referrer, total_received, referrer_claimed, owner_claimed, payment_count</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3>EVM (Contract Storage)</h3>
        <div class="docs-table-wrapper">
          <table class="docs-table">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Deployment</th>
                <th>Key Fields</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>ReferralFactory</code></td>
                <td>One per chain</td>
                <td>createProgram(), predictAddress(), ProgramCreated event</td>
              </tr>
              <tr>
                <td><code>ReferralProgram</code></td>
                <td>EIP-1167 clone per program</td>
                <td>creator, name, commissionBps, platformFeeBps, links mapping, referrerList</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          On Solana, the <code>ReferralLink</code> PDA doubles as the payment address. On EVM chains,
          referrer addresses are stored in a mapping within the program contract.
        </p>
        <div class="docs-callout">
          <strong>Solana Program ID (devnet):</strong> <code>${PROGRAM_ID}</code>
        </div>
      </section>
    </div>
  `;

  // Insert code blocks via DOM (safe textContent rendering)
  const solanaIntegrateSlot = outlet.querySelector('#code-solana-integrate');
  if (solanaIntegrateSlot) solanaIntegrateSlot.replaceWith(createCodeBlock(SNIPPET_SOLANA_INTEGRATE, 'TypeScript — Solana'));

  const evmIntegrateSlot = outlet.querySelector('#code-evm-integrate');
  if (evmIntegrateSlot) evmIntegrateSlot.replaceWith(createCodeBlock(SNIPPET_EVM_INTEGRATE, 'TypeScript — EVM (ethers v6)'));

  const composeSlot = outlet.querySelector('#code-compose');
  if (composeSlot) composeSlot.replaceWith(createCodeBlock(SNIPPET_COMPOSE, 'TypeScript — Solana'));

  const distributeSolanaSlot = outlet.querySelector('#code-distribute-solana');
  if (distributeSolanaSlot) distributeSolanaSlot.replaceWith(createCodeBlock(SNIPPET_DISTRIBUTE, 'TypeScript — Solana'));

  const distributeEvmSlot = outlet.querySelector('#code-distribute-evm');
  if (distributeEvmSlot) distributeEvmSlot.replaceWith(createCodeBlock(SNIPPET_EVM_DISTRIBUTE, 'TypeScript — EVM (ethers v6)'));

  // Table of contents smooth scroll
  outlet.querySelectorAll('.docs-toc-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = (link as HTMLElement).dataset.section;
      const target = outlet.querySelector(`#section-${sectionId}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
