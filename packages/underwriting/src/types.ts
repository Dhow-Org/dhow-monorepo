/**
 * Public types for the underwriting engine. All inputs are optional except the
 * deal essentials — missing signals degrade gracefully to a conservative bin.
 */

export type Grade = "A" | "B" | "C" | "D" | "E" | "DECLINE";

export type SectorRisk = "low" | "medium" | "high";

export interface SellerSignals {
  /** Monthly revenue (USD-equivalent base units, e.g. dollars). */
  monthlyRevenue?: number;
  /** 0..1, higher = more stable revenue (inverse coefficient of variation). */
  revenueConsistency?: number;
  /** inflows / outflows over the window (>1 is healthy). */
  inflowOutflowRatio?: number;
  /** Months in business. */
  monthsTrading?: number;
  /** 0..1 share of invoices diluted (disputes/credit notes) historically. */
  priorDisputeRate?: number;
  /** On-chain cash-flow reputation score, 0..1000 (behavioral). */
  onChainScore?: number;
  /** Count of prior on-time repayments with us (behavioral credibility). */
  onTimeRepayments?: number;
}

export interface BuyerSignals {
  /** Count of prior on-time payments from this buyer to this SME. */
  priorOnTimePayments?: number;
  /** Average days-beyond-terms for this buyer (DBT). */
  avgDaysBeyondTerms?: number;
  /** External commercial credit score, normalised 0..100. */
  externalCreditScore?: number;
  /** 0..1 share of the SME's revenue concentrated in this buyer. */
  concentrationPct?: number;
}

export interface DealSignals {
  /** Invoice face value (same units as monthlyRevenue). */
  invoiceAmount: number;
  /** Days until the invoice is due (tenor). */
  tenorDays: number;
  /** Whether the invoice/buyer has been verified by ops. */
  invoiceVerified: boolean;
  /** Optional advance % the SME asked for (0..1); the engine caps to its own. */
  requestedAdvancePct?: number;
  sectorRisk?: SectorRisk;
}

export interface UnderwritingSignals {
  kybApproved: boolean;
  seller: SellerSignals;
  buyer: BuyerSignals;
  deal: DealSignals;
  /** Current outstanding advance exposure to this SME (for the exposure cap). */
  existingExposure?: number;
}

export interface FeatureContribution {
  feature: string;
  value: number | undefined;
  points: number;
  maxPoints: number;
}

export interface CardResult {
  name: "debtor" | "seller";
  score: number;
  maxScore: number;
  norm: number; // score / maxScore, 0..1
  contributions: FeatureContribution[];
}

export interface ReasonCode {
  code: string;
  feature: string;
  description: string;
  pointsLost: number;
}

export interface Decision {
  approved: boolean;
  grade: Grade;
  /** Blended probability of default, 0..1. */
  pd: number;
  /** Loss given default used in pricing, 0..1. */
  lgd: number;
  /** Approved advance as a fraction of the invoice, 0..1. */
  advancePct: number;
  /** Advance amount (invoice units), after limits. */
  advanceAmount: number;
  /** All-in fee in basis points. */
  feeBps: number;
  /** Max advance the SME could take given limits. */
  limit: number;
  reasonCodes: ReasonCode[];
  guardrailsTriggered: string[];
  cards: CardResult[];
  trace: Record<string, unknown>;
  modelVersion: string;
  policyVersion: string;
}
