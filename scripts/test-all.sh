#!/usr/bin/env bash
# Run every automated test suite in sequence (headless — no browser needed).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "══ contracts (Foundry) ═══════════════════════════════════"
pnpm --filter @dhow/contracts test

echo "══ underwriting engine ═══════════════════════════════════"
pnpm --filter @dhow/underwriting test

echo "══ chain e2e (deploy + full loop on Anvil) ═══════════════"
bash scripts/e2e.sh

echo ""
echo "✔ all suites green"
