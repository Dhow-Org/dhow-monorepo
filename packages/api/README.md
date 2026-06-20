# @dhow/api

dhow backend (NestJS). The off-chain brain: stores the record that can't live on-chain, runs the operator that drives the contracts, and exposes the REST API.

## Modules (this phase)
- `config` — zod-validated env (fails fast on misconfig).
- `prisma` — Postgres data model (SME, Invoice, Advance, Repayment, ReputationSnapshot, KYB, Funder).
- `chain` — viem client + committed contract ABIs; reads state and sends operator txs.
- `invoices` — register (DB + on-chain), verify, list, get.
- `financing` — disburse advance, repay, default, get; snapshots the on-chain cash-flow score.
- `health` — liveness + readiness (DB ping).

Underwriting (advance % + fee) is passed in by the operator for now behind a clean boundary; the data-driven engine replaces it in Phase 3. **Next push:** SIWE auth, funder + reputation endpoints, event indexer, and the Anvil e2e.

## Dev
```bash
# from repo root
cp .env.example .env                 # fill real values; never commit .env
docker compose up -d                 # postgres + anvil

pnpm --filter @dhow/api prisma:generate
pnpm --filter @dhow/api db:migrate    # create tables
pnpm --filter @dhow/api start:dev     # http://localhost:4000  (docs: /api/docs)
```

All addresses/keys come from `.env` — nothing hardcoded. Deploy the contracts (see `@dhow/contracts`) and put the addresses + operator key in `.env`.
