# dhow

> **Codename `dhow`** (placeholder, to be renamed). Stablecoin cross-border payments + cash-flow credit for UAE import/export SMEs — built on **Polygon**.

`dhow` lets a UAE import/export SME pay its overseas suppliers instantly and cheaply in USDC on Polygon (converted to AED at the edge via licensed partners), and access working-capital credit underwritten in hours from real cash flow — not locked collateral. The platform is **non-custodial**: it is the software + underwriting layer; licensed partners are the regulated entities of record.

## Monorepo

| Package | Purpose | Status |
|---|---|---|
| `packages/contracts` | On-chain registries + financing pool (Foundry/Solidity, Polygon) | **Phase 1** |
| `packages/shared` | Shared TS types, schemas, config | Phase 2 |
| `packages/api` | NestJS backend (auth, domain, chain client) | Phase 2 |
| `packages/underwriting` | Cash-flow credit scoring engine | Phase 3 |
| `packages/adapters` | External integrations (Lean, Circle/CCTP, ERC-4337, off-ramp) | Phase 4 |
| `packages/web` | Next.js SME cockpit + funder dashboard | Phase 5 |

See [`BUILD-PLAN.md`](./BUILD-PLAN.md) for the full phased plan.

## Principles
Production-grade only · no hardcoded/mock data in product code · real sandbox/testnet integrations behind adapters · non-custodial · ship phase by phase.

## Getting started
```bash
pnpm install
cp .env.example .env        # fill in real values (RPC, keys) — never commit .env

# contracts (Foundry)
pnpm --filter @dhow/contracts build
pnpm --filter @dhow/contracts test
```

## Networks
Target **Polygon PoS** (Amoy testnet first). All addresses/keys via `.env` — never hardcoded.

## License
UNLICENSED (private, pre-release).
