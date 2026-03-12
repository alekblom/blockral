# Blockral - Web3 Referral Platform

Trustless, on-chain referral programs on Solana. Product owners set commission rates, referrers earn automatically through smart contract splits.

Part of the [buidlings.com](https://buidlings.com) ecosystem, powered by [coinallocator.com](https://coinallocator.com) fund-splitting primitives.

## Why Web3 Referrals?

- **Immutable commission terms** - rates can't be cut retroactively
- **Trustless instant payouts** - no net-30, no minimums, funds split atomically
- **Transparent on-chain tracking** - no disputes, publicly auditable
- **Permissionless joining** - no applications, no geo restrictions
- **Composable** - other dApps can integrate programmatically

## How It Works

1. **Create Program** - Product owner deploys a referral program with commission rate
2. **Join Program** - Referrer joins and gets a unique payment address (PDA)
3. **Receive Payments** - Customers pay to the referral link address
4. **Distribute** - Anyone can trigger distribution: owner, referrer, and platform each get their share

## Architecture

### Smart Contract (Solana / Anchor 0.31.1)

Two PDA account types:

- **ReferralProgram** (`["program", creator, name]`) - Commission config, stats
- **ReferralLink** (`["link", program_pda, referrer]`) - Payment address, balance tracking

### Frontend (Vite 5 + TypeScript)

Vanilla TypeScript SPA with hash routing, observable store, Phantom + Solflare wallet adapters.

## Self-Hosting

Blockral is open source. To run your own instance with zero platform fees:

```bash
# Clone
git clone https://github.com/buidlings/blockral.com
cd blockral.com

# Build contract (requires Docker)
cd contract
docker run --rm --network host -v "$(pwd)":/workdir -w /workdir ubuntu:22.04 bash -c '
  set -e && export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq && apt-get install -y -qq curl build-essential pkg-config libudev-dev libssl-dev
  curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain 1.87.0
  export PATH="/root/.cargo/bin:$PATH"
  sh -c "$(curl -sSfL https://release.anza.xyz/v3.1.8/install)"
  export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"
  cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli --locked
  anchor build
'

# Deploy contract
solana program deploy target/deploy/blockral.so --url devnet
cd ..

# Build frontend (zero platform fee for self-hosters)
cd frontend
VITE_PLATFORM_FEE_BPS=0 npm run build
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_PLATFORM_FEE_BPS` | `0` | Platform fee in basis points. Default `0` (no on-chain fee). |
| `VITE_PLATFORM_WALLET` | _(empty)_ | Platform wallet pubkey. Only needed if fee > 0. |

## Development

```bash
# Frontend dev server
cd frontend && npm install && npm run dev

# Contract tests
cd contract && anchor test
```

## License

MIT - see [LICENSE](LICENSE)

## Links

- [blockral.com](https://blockral.com) - Hosted instance
- [buidlings.com](https://buidlings.com) - Parent ecosystem
- [coinallocator.com](https://coinallocator.com) - Fund-splitting primitives
