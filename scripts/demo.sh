#!/usr/bin/env bash
# One command → the whole app running against your configured chain (e.g. live Amoy).
#   Postgres (docker) + DB schema + API (:4000) + web (:5173).
# Prereqs: pnpm install; a filled .env (contracts deployed, addresses wired); Docker running.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

[ -f .env ] || {
  echo "✗ No .env found. Copy .env.example to .env, deploy contracts, and wire the addresses."
  exit 1
}
# Load env so the API inherits RPC/keys/addresses (it reads process.env).
set -a
. ./.env
set +a

echo "▶ Postgres…"
docker compose up -d postgres
until docker compose exec -T postgres pg_isready -U dhow >/dev/null 2>&1; do sleep 1; done

echo "▶ Database schema…"
pnpm --filter @dhow/api exec prisma generate
pnpm --filter @dhow/api exec prisma db push --skip-generate --accept-data-loss

echo "▶ Starting API (:4000) and web (:5173)…"
pnpm --filter @dhow/api start:dev &
API_PID=$!
pnpm --filter @dhow/web dev &
WEB_PID=$!
trap 'kill "$API_PID" "$WEB_PID" 2>/dev/null || true' EXIT

echo ""
echo "  ➜ App:      http://localhost:5173"
echo "  ➜ API docs: http://localhost:4000/api/docs"
echo "  (Ctrl+C to stop)"
wait
