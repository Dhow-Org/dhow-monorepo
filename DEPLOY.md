# Deploy guide — API on Railway, Web on Vercel

Deploys the live demo against the **already-deployed Polygon Amoy contracts**. Do the API first (you need its URL for the web).

Order: **1) Railway (API + Postgres) → 2) Vercel (web) → 3) point them at each other.**

---

## 1. API on Railway

Railway builds from the repo-root **`Dockerfile`** (config in `railway.json`).

**a. Create the service**
- New Project → Deploy from GitHub repo → pick `Dhow-Org/dhow-monorepo`.
- Railway detects the `Dockerfile`. Leave the root directory as the repo root.

**b. Add a database**
- In the project: **New → Database → PostgreSQL**. Railway sets `DATABASE_URL` and exposes it as a variable.
- On the API service, reference it: set `DATABASE_URL = ${{Postgres.DATABASE_URL}}`.

**c. Set the API service variables** (Variables tab). Railway injects `PORT` automatically — don't set it.

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `NODE_ENV` | `production` |
| `CHAIN_ID` | `80002` |
| `RPC_URL` | `https://rpc-amoy.polygon.technology` |
| `OPERATOR_PRIVATE_KEY` | `0x<your Amoy operator key>` (the deployer wallet) |
| `INVOICE_REGISTRY_ADDRESS` | `0x9f4FF2Bf926D63045023B5E3790AE13A39184070` |
| `FINANCING_POOL_ADDRESS` | `0x7b09a692d9d6c55b9Ed8ddf61e9cde847cC3910f` |
| `REPUTATION_REGISTRY_ADDRESS` | `0xcACa226C6b8D4fd6F3Ac75d7ef16e43585E3eb30` |
| `USDC_ADDRESS` | `0xdC48E5e5c3Cf91b6db9ec0f329a14188174632C2` |
| `OPS_ADDRESSES` | `0x73A5021c0935b79D46C2D650821b212dC5b3b9Eb` (comma-separate to add more ops wallets) |
| `JWT_SECRET` | a long random string |
| `CORS_ORIGINS` | your Vercel URL (set after step 2, e.g. `https://dhow.vercel.app`) — use `*` temporarily |
| `INDEXER_ENABLED` | `true` |
| `LEAN_APP_TOKEN` | (optional) Lean sandbox token to activate real cash-flow signals |
| `OFFRAMP_API_URL` / `OFFRAMP_API_KEY` | (optional) off-ramp partner creds |

**d. Deploy & verify**
- Generate a public domain (Settings → Networking → Generate Domain).
- The container runs `pnpm run start:prod` → `prisma db push` (creates tables) → starts NestJS on `0.0.0.0:$PORT`.
- Check: `https://<railway-domain>/api/health` → `{"status":"ok"}`; docs at `/api/docs`.

> **Security note:** the operator key moves real (test) funds. Use the Amoy testnet key only; never a mainnet key. Store it only in Railway's Variables, never in git.

---

## 2. Web on Vercel

Vercel uses the repo-root **`vercel.json`** (builds the workspace deps, then the Vite app, outputs `packages/web/dist`, with SPA rewrites).

**a. Import the project**
- New Project → import `Dhow-Org/dhow-monorepo`.
- Framework preset: **Other** (vercel.json already sets build/output). Leave root directory as the repo root.

**b. Set environment variables** (build-time)

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://<railway-domain>/api` |
| `VITE_USDC_ADDRESS` | `0xdC48E5e5c3Cf91b6db9ec0f329a14188174632C2` |

**c. Deploy** → you get `https://<something>.vercel.app`.

---

## 3. Connect them

- Back on **Railway**, set `CORS_ORIGINS` to your exact Vercel URL (e.g. `https://dhow.vercel.app`) and redeploy. (Keep `*` only for quick testing.)
- Open the Vercel URL → **Connect wallet** (use the ops wallet `0x73A5…b9Eb`, or add your wallet to `OPS_ADDRESSES`) → run the golden path: New invoice → Verify → Get quote → Finance.
- Everything settles on **Polygon Amoy** — watch it on [amoy.polygonscan.com](https://amoy.polygonscan.com/address/0x7b09a692d9d6c55b9Ed8ddf61e9cde847cC3910f).

---

## Notes & gotchas
- **Wallet network:** add Amoy (chainId 80002) to your browser wallet; the SME wallet needs **no POL** (the operator pays gas), only enough to sign the login (free).
- **Ops actions** (verify/disburse/repay) require the connected wallet to be in `OPS_ADDRESSES`. For the demo, connect the operator wallet itself.
- **Free tiers:** Railway Postgres + a small service and Vercel Hobby are enough for the demo; the API sleeps only if you use a plan that idles — Railway keeps it warm on the trial/hobby plan.
- **Custom domain:** point `dhow.<yourdomain>` at Vercel; update `CORS_ORIGINS` + `VITE_API_URL` accordingly.
- **Contracts are already deployed & Polygonscan-verified** — you do NOT redeploy them to demo. Addresses live in `SUBMISSION.md` §8.
