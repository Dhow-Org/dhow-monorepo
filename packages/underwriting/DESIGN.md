# @dhow/underwriting — design

A **deterministic, explainable** cash-flow underwriting engine for receivables financing. Built on standard quantitative-credit methodology (scorecards + expected-loss pricing + reason codes + governance), so it is institutional-grade from day one and **ML-ready** — v2 swaps expert points for fitted coefficients without touching the architecture.

`assess(signals) -> Decision` is a **pure function**: same inputs always yield the same output (grade, PD, advance %, fee, reason codes, trace, model/policy version).

## Why deterministic (v1)
You cannot train a credit model on defaults you have not observed (cold start), and a lender must be able to explain every decision (funders, disputes, regulators). So v1 uses **expert-set points** with full scorecard structure; the **governance harness (PSI + backtest)** tells us when enough data exists to move to v2.

```
v1 (now):  expert-set scorecard points                  -> lend, conservatively
v2:        fit points via SIGN-CONSTRAINED logistic regression + reject inference
v3:        gradient-boosted score UNDER the same guardrail + reason-code + PSI layer
```

## Architecture

**1. Dual scorecard (+ deal layer).** In receivables, *the buyer pays the invoice*, so buyer risk dominates.
- **Debtor (buyer) card** — `avgDaysBeyondTerms` (DBT), prior on-time payments, external commercial score, concentration.
- **Seller (SME) card** — monthly revenue, revenue consistency, inflow/outflow ratio, months trading, **on-chain reputation** (behavioral), prior dispute/dilution rate.
- Blend: `0.6·debtorNorm + 0.4·sellerNorm`.

**2. WoE-style monotonic binning -> additive points.** Each feature is binned with **monotonic** points (higher points = lower risk), so the score is explainable and robust to outliers. Missing signals degrade to a **conservative bin**, never a crash — so the engine works today (on-chain + invoice data) and lights up as Open Finance / buyer data arrive.

**3. Application + behavioral blend = the reputation flywheel.** New SMEs lean on application features + conservative priors; as on-chain repayment history accrues, the behavioral features (on-chain score, dispute rate) carry the decision. That is "earn cheaper credit as your score builds," done rigorously.

**4. PD calibration via anchor points.** Blended norm -> PD by **piecewise-linear interpolation in log-odds** between expert anchor points (`norm 1.0->0.5% … 0.0->45%`). Smooth, monotonic, and re-anchored from observed defaults in v2.

**5. Expected-loss pricing (`EL = PD·LGD·EAD`).**
- `EAD` = the advance.
- `LGD = base(0.30) + 0.5·dilution − strong-seller relief`, clamped — receivables recover well (reserve + recourse), and **dilution** is the real loss driver.
- `fee = EL + funding·tenor + opex + margin`, floored/capped.
- `advance%` = base-by-grade − dilution, capped by the SME's request and limits.
- `limit = min(1.5×monthly revenue, exposure cap − existing exposure)`.

**6. Hard guardrails (override the score).** KYB · invoice verified · min revenue · tenor cap · hard buyer concentration · score cutoff. Any trigger -> decline.

**7. Reason codes.** Per feature: `maxPoints − earnedPoints = points lost`; the top ≤4 are returned (adverse-action style) — for both declines and "what's holding the grade back."

**8. Governance.** Every decision stamps `modelVersion` + `policyVersion` and a full `trace`. `psi()` monitors feature/score drift (`<0.1 stable | 0.1–0.25 shift | >0.25 significant`). The pure-function design makes **champion/challenger** trivial (run two policies in shadow, compare).

## Files
`types.ts` (signals/decision) · `policy.ts` (versioned bins/points, anchors, pricing, guardrails) · `binning.ts` · `scorecard.ts` · `calibration.ts` (norm→PD, grade) · `pricing.ts` · `guardrails.ts` · `reasons.ts` · `governance/psi.ts` · `engine.ts` (`assess`).

## How we prove it's good
- **Now:** property tests — monotonicity (better signals never worsen terms), bounds (advance ∈ [0,0.95], fee ∈ [50,3000] bps, PD ∈ (0,1)), determinism, guardrails.
- **With data:** discrimination (Gini/KS/AUC), calibration (predicted vs actual PD), stability (PSI), Information Value per feature.

## Honest scope
v1's **coefficients are expert priors** (no loss data yet). The architecture, calibration, pricing, explainability, and governance are full institutional-grade — that is the right meaning of "best-in-class deterministic": world-class structure, expert priors, ML-ready.
