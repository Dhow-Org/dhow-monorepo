import { GUARDRAILS } from "./policy";
import type { UnderwritingSignals } from "./types";

export interface GuardrailResult {
  triggered: string[];
  hardDecline: boolean;
}

/** Hard rules that override the score. */
export function evaluateGuardrails(s: UnderwritingSignals, norm: number): GuardrailResult {
  const triggered: string[] = [];

  if (!s.kybApproved) triggered.push("KYB_NOT_APPROVED");
  if (!s.deal.invoiceVerified) triggered.push("INVOICE_NOT_VERIFIED");
  if (s.deal.tenorDays > GUARDRAILS.maxTenorDays) triggered.push("TENOR_TOO_LONG");
  if (s.seller.monthlyRevenue !== undefined && s.seller.monthlyRevenue < GUARDRAILS.minRevenue) {
    triggered.push("BELOW_MIN_REVENUE");
  }
  if (s.buyer.concentrationPct !== undefined && s.buyer.concentrationPct > GUARDRAILS.hardConcentration) {
    triggered.push("BUYER_CONCENTRATION");
  }
  if (norm < GUARDRAILS.declineBelowNorm) triggered.push("SCORE_BELOW_CUTOFF");

  return { triggered, hardDecline: triggered.length > 0 };
}
