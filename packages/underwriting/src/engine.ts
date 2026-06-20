import { CARD_WEIGHTS, DEBTOR_CARD, MODEL_VERSION, POLICY_VERSION, SELLER_CARD } from "./policy";
import { scoreCard } from "./scorecard";
import { calibratePd, gradeForNorm } from "./calibration";
import { evaluateGuardrails } from "./guardrails";
import { price } from "./pricing";
import { reasonCodes } from "./reasons";
import type { Decision, UnderwritingSignals } from "./types";

/**
 * The deterministic underwriting decision. Pure function of the signals:
 * dual scorecard -> blended PD -> grade -> guardrails -> expected-loss pricing,
 * with reason codes and a full trace. Same inputs always yield the same output.
 */
export function assess(signals: UnderwritingSignals): Decision {
  const debtor = scoreCard("debtor", signals.buyer, DEBTOR_CARD);
  const seller = scoreCard("seller", signals.seller, SELLER_CARD);
  const cards = [debtor, seller];

  const blendedNorm = CARD_WEIGHTS.debtor * debtor.norm + CARD_WEIGHTS.seller * seller.norm;
  const pd = calibratePd(blendedNorm);
  const scoreGrade = gradeForNorm(blendedNorm);
  const guard = evaluateGuardrails(signals, blendedNorm);
  const reasons = reasonCodes(cards);

  const baseTrace = {
    blendedNorm,
    debtorNorm: debtor.norm,
    sellerNorm: seller.norm,
    cardWeights: CARD_WEIGHTS,
    scoreGrade,
  };

  if (guard.hardDecline || scoreGrade === "DECLINE") {
    return {
      approved: false,
      grade: "DECLINE",
      pd,
      lgd: 0,
      advancePct: 0,
      advanceAmount: 0,
      feeBps: 0,
      limit: 0,
      reasonCodes: reasons,
      guardrailsTriggered: guard.triggered,
      cards,
      trace: baseTrace,
      modelVersion: MODEL_VERSION,
      policyVersion: POLICY_VERSION,
    };
  }

  const priced = price({
    grade: scoreGrade,
    pd,
    sellerNorm: seller.norm,
    priorDisputeRate: signals.seller.priorDisputeRate,
    invoiceAmount: signals.deal.invoiceAmount,
    tenorDays: signals.deal.tenorDays,
    requestedAdvancePct: signals.deal.requestedAdvancePct,
    monthlyRevenue: signals.seller.monthlyRevenue,
    existingExposure: signals.existingExposure ?? 0,
  });

  return {
    approved: true,
    grade: scoreGrade,
    pd,
    lgd: priced.lgd,
    advancePct: priced.advancePct,
    advanceAmount: priced.advanceAmount,
    feeBps: priced.feeBps,
    limit: priced.limit,
    reasonCodes: reasons,
    guardrailsTriggered: guard.triggered,
    cards,
    trace: baseTrace,
    modelVersion: MODEL_VERSION,
    policyVersion: POLICY_VERSION,
  };
}
