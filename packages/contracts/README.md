# @dhow/contracts

On-chain layer for `dhow` — Solidity (Foundry), targeting **Polygon PoS** (Amoy testnet first).

## Contracts

| Contract | Responsibility | Holds funds? |
|---|---|---|
| `InvoiceRegistry` | Registers/verifies tokenized receivables; lifecycle + **anti-double-financing** (unique external ref) | No |
| `FinancingPool` | Licensed-funder USDC liquidity; disburses receivable advances against verified invoices; principal/fee split on repayment; default loss handling | Funder liquidity only |
| `ReputationRegistry` | Records financing/repayment/default → 0–1000 cash-flow credit score + tiers | No |

Underwriting (advance % and fee) is computed **off-chain** by the engine and passed to `FinancingPool.disburse` by an `OPERATOR`. The pool enforces invariants, accounting, and settlement on-chain.

## Roles
- `InvoiceRegistry`: `REGISTRAR_ROLE` (register/cancel), `VERIFIER_ROLE` (verify), `FINANCER_ROLE` (the pool: financed/repaid/defaulted).
- `FinancingPool`: `OPERATOR_ROLE` (disburse/default), `FUNDER_ROLE` (whitelisted licensed funders: deposit), `DEFAULT_ADMIN_ROLE` (pause).
- `ReputationRegistry`: `ATTESTER_ROLE` (the pool + backend).

## Develop
```bash
forge install                 # forge-std + openzeppelin-contracts (run once)
forge build
forge test -vv

# deploy (env-driven; see ../../.env.example)
forge script script/Deploy.s.sol:Deploy --rpc-url amoy --broadcast --verify
```

## Notes
- `test/mocks/TestERC20.sol` is **test-only**; real USDC address is supplied via env on each network.
- Funder loss socialisation across multiple funders is intentionally simple in v1 (withdrawals bounded by available liquidity; realised losses tracked via `totalLosses`); full pro-rata loss allocation is a later hardening phase.
