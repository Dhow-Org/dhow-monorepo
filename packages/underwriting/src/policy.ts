/**
 * The VERSIONED policy: feature bins/points (expert priors in v1; swap for
 * fitted coefficients in v2 without touching the engine), PD calibration
 * anchors, pricing parameters, and guardrail thresholds.
 *
 * Points are designed monotonic (higher points = lower risk) so the scorecard
 * is explainable and robust to outliers.
 */
import type { BuyerSignals, Grade, SellerSignals, UnderwritingSignals } from "./types";

export const MODEL_VERSION = "dhow-scorecard-v1";
export const POLICY_VERSION = "policy-2026-06-1";

/** A bin: a value belongs to the first bin whose `upTo` it does not exceed. */
export interface Bin {
  upTo: number;
  points: number;
}

export interface FeatureSpec<S> {
  feature: string;
  extract: (s: S) => number | undefined;
  bins: Bin[]; // ascending upTo, last = Infinity
  /** Conservative points used when the signal is missing. */
  missingPoints: number;
}

const PTS_MAX = 100;

// --------------------------- Debtor (buyer) card --------------------------- //
// The buyer pays the invoice, so this card carries the most weight.

export const DEBTOR_CARD: FeatureSpec<BuyerSignals>[] = [
  {
    feature: "buyer.avgDaysBeyondTerms",
    extract: (b) => b.avgDaysBeyondTerms,
    bins: [
      { upTo: 3, points: 100 },
      { upTo: 10, points: 80 },
      { upTo: 20, points: 55 },
      { upTo: 45, points: 30 },
      { upTo: 90, points: 12 },
      { upTo: Infinity, points: 0 },
    ],
    missingPoints: 45,
  },
  {
    feature: "buyer.priorOnTimePayments",
    extract: (b) => b.priorOnTimePayments,
    bins: [
      { upTo: 0, points: 30 },
      { upTo: 1, points: 50 },
      { upTo: 3, points: 72 },
      { upTo: 6, points: 88 },
      { upTo: Infinity, points: 100 },
    ],
    missingPoints: 30,
  },
  {
    feature: "buyer.externalCreditScore",
    extract: (b) => b.externalCreditScore,
    bins: [
      { upTo: 39, points: 10 },
      { upTo: 59, points: 40 },
      { upTo: 74, points: 68 },
      { upTo: 89, points: 88 },
      { upTo: Infinity, points: 100 },
    ],
    missingPoints: 35,
  },
  {
    feature: "buyer.concentrationPct",
    extract: (b) => b.concentrationPct,
    bins: [
      { upTo: 0.2, points: 100 },
      { upTo: 0.4, points: 78 },
      { upTo: 0.6, points: 52 },
      { upTo: 0.8, points: 28 },
      { upTo: Infinity, points: 10 },
    ],
    missingPoints: 50,
  },
];

// ---------------------------- Seller (SME) card ---------------------------- //
// Mixes application features (revenue, tenure) with behavioral ones (on-chain
// score, dilution) — the behavioral side strengthens as history accrues.

export const SELLER_CARD: FeatureSpec<SellerSignals>[] = [
  {
    feature: "seller.monthlyRevenue",
    extract: (s) => s.monthlyRevenue,
    bins: [
      { upTo: 4999, points: 12 },
      { upTo: 19999, points: 38 },
      { upTo: 49999, points: 62 },
      { upTo: 149999, points: 85 },
      { upTo: Infinity, points: 100 },
    ],
    missingPoints: 35,
  },
  {
    feature: "seller.revenueConsistency",
    extract: (s) => s.revenueConsistency,
    bins: [
      { upTo: 0.3, points: 15 },
      { upTo: 0.5, points: 40 },
      { upTo: 0.7, points: 65 },
      { upTo: 0.85, points: 85 },
      { upTo: Infinity, points: 100 },
    ],
    missingPoints: 35,
  },
  {
    feature: "seller.inflowOutflowRatio",
    extract: (s) => s.inflowOutflowRatio,
    bins: [
      { upTo: 0.9, points: 10 },
      { upTo: 1.0, points: 35 },
      { upTo: 1.15, points: 65 },
      { upTo: 1.3, points: 85 },
      { upTo: Infinity, points: 100 },
    ],
    missingPoints: 35,
  },
  {
    feature: "seller.monthsTrading",
    extract: (s) => s.monthsTrading,
    bins: [
      { upTo: 5, points: 15 },
      { upTo: 11, points: 40 },
      { upTo: 23, points: 65 },
      { upTo: 47, points: 85 },
      { upTo: Infinity, points: 100 },
    ],
    missingPoints: 35,
  },
  {
    feature: "seller.onChainScore",
    extract: (s) => s.onChainScore,
    bins: [
      { upTo: 299, points: 20 },
      { upTo: 599, points: 50 },
      { upTo: 849, points: 80 },
      { upTo: Infinity, points: 100 },
    ],
    missingPoints: 50, // == the 500 protocol-initial score (Silver)
  },
  {
    feature: "seller.priorDisputeRate",
    extract: (s) => s.priorDisputeRate,
    bins: [
      { upTo: 0.02, points: 100 },
      { upTo: 0.05, points: 75 },
      { upTo: 0.1, points: 45 },
      { upTo: 0.2, points: 20 },
      { upTo: Infinity, points: 5 },
    ],
    missingPoints: 60,
  },
];

export const CARD_MAX_POINTS = PTS_MAX;

/** Card blend weights — the buyer dominates because the buyer pays the invoice. */
export const CARD_WEIGHTS = { debtor: 0.6, seller: 0.4 } as const;

/**
 * PD calibration anchors (norm 0..1 -> PD). Interpolated in log-odds for a
 * smooth, monotonic curve. Expert priors in v1; re-anchored from observed
 * defaults in v2.
 */
export const PD_ANCHORS: { norm: number; pd: number }[] = [
  { norm: 1.0, pd: 0.005 },
  { norm: 0.85, pd: 0.01 },
  { norm: 0.7, pd: 0.03 },
  { norm: 0.55, pd: 0.07 },
  { norm: 0.4, pd: 0.14 },
  { norm: 0.25, pd: 0.25 },
  { norm: 0.0, pd: 0.45 },
];

export const GRADE_BANDS: { grade: Exclude<Grade, "DECLINE">; minNorm: number }[] = [
  { grade: "A", minNorm: 0.85 },
  { grade: "B", minNorm: 0.7 },
  { grade: "C", minNorm: 0.55 },
  { grade: "D", minNorm: 0.4 },
  { grade: "E", minNorm: 0.25 },
];

/** Base advance % per grade (reduced by dilution in pricing). */
export const ADVANCE_BY_GRADE: Record<Exclude<Grade, "DECLINE">, number> = {
  A: 0.9,
  B: 0.88,
  C: 0.85,
  D: 0.8,
  E: 0.72,
};

export const PRICING = {
  baseLgd: 0.3,
  dilutionLgdFactor: 0.5, // LGD += factor * priorDisputeRate
  strongSellerRelief: 0.05, // LGD -= relief if seller norm > 0.7
  lgdMin: 0.1,
  lgdMax: 0.6,
  fundingAprBps: 1200, // 12% APR cost of capital
  opexBps: 50,
  marginBps: 100,
  minFeeBps: 50,
  maxFeeBps: 3000,
  revenueLimitMultiple: 1.5, // limit <= 1.5x monthly revenue when known
  maxExposurePerSme: 250_000,
} as const;

export const GUARDRAILS = {
  minRevenue: 2000,
  maxTenorDays: 120,
  hardConcentration: 0.85,
  declineBelowNorm: 0.25,
} as const;

/** Human-readable reason text per feature, for adverse-action style codes. */
export const REASON_TEXT: Record<string, string> = {
  "buyer.avgDaysBeyondTerms": "Buyer pays beyond agreed terms",
  "buyer.priorOnTimePayments": "Limited on-time payment history from this buyer",
  "buyer.externalCreditScore": "Buyer commercial credit score is low or unknown",
  "buyer.concentrationPct": "High revenue concentration in this buyer",
  "seller.monthlyRevenue": "Monthly revenue is low or unknown",
  "seller.revenueConsistency": "Revenue is volatile or unknown",
  "seller.inflowOutflowRatio": "Cash inflow/outflow ratio is weak or unknown",
  "seller.monthsTrading": "Short trading history",
  "seller.onChainScore": "On-chain repayment reputation is low",
  "seller.priorDisputeRate": "History of invoice disputes/dilution",
};

export type AnyFeatureSpec = FeatureSpec<BuyerSignals> | FeatureSpec<SellerSignals>;
export type { UnderwritingSignals };
