#!/usr/bin/env bash
# Chain-level e2e: boot Anvil, deploy contracts + seed liquidity, run the
# register -> verify -> disburse -> repay -> score loop through ChainService.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RPC="http://127.0.0.1:8545"
ANVIL_LOG="$(mktemp)"

cd "$ROOT"

setsid anvil >"$ANVIL_LOG" 2>&1 </dev/null &
ANVIL_PID=$!
trap 'kill "$ANVIL_PID" 2>/dev/null || true; pkill -f "anvil" 2>/dev/null || true' EXIT

# Wait until Anvil answers (no sleep).
until cast block-number --rpc-url "$RPC" >/dev/null 2>&1; do :; done

PK0="$(grep -oE '\(0\) 0x[0-9a-fA-F]{64}' "$ANVIL_LOG" | head -1 | grep -oE '0x[0-9a-fA-F]{64}')"
[ -n "$PK0" ] || { echo "could not read Anvil deployer key"; cat "$ANVIL_LOG"; exit 1; }

# Run from the Foundry project dir so the script path resolves (--root does not
# relocate the script-path argument).
OUT="$(cd packages/contracts && DEPLOYER_PRIVATE_KEY="$PK0" \
  forge script script/DeployLocal.s.sol:DeployLocal --rpc-url "$RPC" --broadcast 2>&1)"

pick() { echo "$OUT" | grep -oE "$1= 0x[0-9a-fA-F]{40}" | grep -oE '0x[0-9a-fA-F]{40}' | head -1; }
USDC="$(pick USDC_ADDRESS)"
INV="$(pick INVOICE_REGISTRY_ADDRESS)"
POOL="$(pick FINANCING_POOL_ADDRESS)"
REP="$(pick REPUTATION_REGISTRY_ADDRESS)"

if [ -z "$USDC" ] || [ -z "$INV" ] || [ -z "$POOL" ] || [ -z "$REP" ]; then
  echo "deploy/parse failed"; echo "$OUT" | tail -30; exit 1
fi
echo "deployed: usdc=$USDC registry=$INV pool=$POOL reputation=$REP"

export RPC_URL="$RPC" CHAIN_ID=31337 OPERATOR_PRIVATE_KEY="$PK0" \
  USDC_ADDRESS="$USDC" INVOICE_REGISTRY_ADDRESS="$INV" \
  FINANCING_POOL_ADDRESS="$POOL" REPUTATION_REGISTRY_ADDRESS="$REP" \
  JWT_SECRET="0123456789abcdef" DATABASE_URL="postgresql://unused" API_PORT=4000 NODE_ENV=test

pnpm --filter @dhow/api exec tsx test/e2e.chain.ts
