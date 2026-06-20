# @dhow/web

The dhow web app — **SME cockpit** + **funder dashboard**. Vite + React + TypeScript, Tailwind, wagmi/viem, TanStack Query.

Connects to `@dhow/api`: wallet connect + **SIWE** login, register/verify/finance receivables, and the **underwriting verdict** (grade, advance %, fee, reason codes) with a live **bank-vs-dhow** savings compare.

## Dev
```bash
cp .env.example .env          # set VITE_API_URL + VITE_USDC_ADDRESS
# in another terminal: docker compose up -d && pnpm --filter @dhow/api start:dev
pnpm --filter @dhow/web dev   # http://localhost:5173  (proxies /api -> :4000)
```

## Build
```bash
pnpm --filter @dhow/web build   # tsc --noEmit + vite build
```

## Design
Deep-water maritime identity — petrol-teal ground, brass accent, sail-canvas text; Fraunces (display) / Hanken Grotesk (UI) / IBM Plex Mono (figures). Signature: the underwriting verdict as a brass **manifest seal** + the invoice **voyage line**. Responsive, keyboard-focusable, honours reduced motion.
