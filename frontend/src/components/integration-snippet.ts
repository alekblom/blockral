import { PROGRAM_ID } from '../constants';
import { showToast } from './toast';

function getSnippetCode(programAddress: string, programName: string): string {
  return `import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";

// Blockral program ID
const BLOCKRAL_PROGRAM_ID = new PublicKey("${PROGRAM_ID}");

// Your referral program: ${programName}
const REFERRAL_PROGRAM = new PublicKey("${programAddress}");

/**
 * Derive the referral link PDA for a given referrer.
 * The PDA is also the payment address — send SOL directly to it.
 */
function deriveReferralLinkPDA(referrer: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("link"), REFERRAL_PROGRAM.toBuffer(), referrer.toBuffer()],
    BLOCKRAL_PROGRAM_ID,
  );
  return pda;
}

/**
 * Build a SOL transfer instruction to a referral link PDA.
 * Add this to your existing transaction for atomic composition —
 * if the transaction fails, the referral payment is rolled back too.
 */
function buildReferralPaymentIx(
  payer: PublicKey,
  referrer: PublicKey,
  lamports: number,
): TransactionInstruction {
  const linkPda = deriveReferralLinkPDA(referrer);
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: linkPda,
    lamports,
  });
}

// Usage: compose with your existing transaction
// const tx = new Transaction()
//   .add(yourMintInstruction)         // your primary instruction
//   .add(buildReferralPaymentIx(      // atomic referral payment
//     buyer,                           // payer
//     referrerPubkey,                  // the referrer who sent the buyer
//     0.1 * 1e9,                      // 0.1 SOL in lamports
//   ));
// If the mint fails, the referral payment is automatically rolled back.`;
}

export function createIntegrationSnippet(programAddress: string, programName: string): HTMLElement {
  const section = document.createElement('div');
  section.className = 'integration-section';

  const header = document.createElement('div');
  header.className = 'integration-header';
  header.innerHTML = `
    <h3>Integration Guide</h3>
    <span class="integration-toggle">&#9654;</span>
  `;

  const body = document.createElement('div');
  body.className = 'integration-body';
  body.style.display = 'none';

  const desc = document.createElement('p');
  desc.className = 'integration-desc';
  desc.textContent = 'Compose referral payments into your Solana transactions. If your primary instruction fails (e.g., item sold out), the referral payment is atomically rolled back.';
  body.appendChild(desc);

  const codeWrapper = document.createElement('div');
  codeWrapper.className = 'integration-code-wrapper';

  const codeHeader = document.createElement('div');
  codeHeader.className = 'integration-code-header';
  codeHeader.innerHTML = '<span>TypeScript</span>';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn-secondary btn-sm';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(getSnippetCode(programAddress, programName));
    showToast('Code copied to clipboard', 'info');
  });
  codeHeader.appendChild(copyBtn);

  const pre = document.createElement('pre');
  pre.className = 'integration-code';
  const code = document.createElement('code');
  code.textContent = getSnippetCode(programAddress, programName);
  pre.appendChild(code);

  codeWrapper.appendChild(codeHeader);
  codeWrapper.appendChild(pre);
  body.appendChild(codeWrapper);

  section.appendChild(header);
  section.appendChild(body);

  header.addEventListener('click', () => {
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    const toggle = header.querySelector('.integration-toggle')!;
    toggle.innerHTML = isOpen ? '&#9654;' : '&#9660;';
  });

  return section;
}
