import { ADVANCE_BY_GRADE, PRICING } from "./policy";
import type { Grade } from "./types";

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

export interface PriceInputs {
  grade: Exclude<Grade, "DECLINE">;
  pd: number;
  sellerNorm: number;
  priorDisputeRate: number | undefined;
  invoiceAmount: number;
  tenorDays: number;
  requestedAdvancePct: number | undefined;
  monthlyRevenue: number | undefined;
  existingExposure: number;
}

export interface PriceResult {
  lgd: number;
  advancePct: number;
  advanceAmount: number;
  feeBps: number;
  limit: number;
}

/** Expected-loss pricing: fee covers EL (PD x LGD) + funding + opex + margin. */
export function price(p: PriceInputs): PriceResult {
  const dilution = p.priorDisputeRate ?? 0;

  let lgd = PRICING.baseLgd + PRICING.dilutionLgdFactor * dilution;
  if (p.sellerNorm > 0.7) lgd -= PRICING.strongSellerRelief;
  lgd = clamp(lgd, PRICING.lgdMin, PRICING.lgdMax);

  let advancePct = ADVANCE_BY_GRADE[p.grade] - 0.5 * dilution;
  if (p.requestedAdvancePct !== undefined) advancePct = Math.min(advancePct, p.requestedAdvancePct);
  advancePct = clamp(advancePct, 0, 0.95);

  const revenueLimit =
    p.monthlyRevenue !== undefined ? PRICING.revenueLimitMultiple * p.monthlyRevenue : Number.POSITIVE_INFINITY;
  const exposureRoom = Math.max(0, PRICING.maxExposurePerSme - p.existingExposure);
  const limit = Math.min(revenueLimit, exposureRoom);

  const advanceAmount = Math.max(0, Math.min(p.invoiceAmount * advancePct, limit));

  const elBps = p.pd * lgd * 10_000;
  const fundingBps = (PRICING.fundingAprBps * p.tenorDays) / 365;
  const feeBps = clamp(
    Math.round(elBps + fundingBps + PRICING.opexBps + PRICING.marginBps),
    PRICING.minFeeBps,
    PRICING.maxFeeBps,
  );

  return { lgd, advancePct, advanceAmount, feeBps, limit };
}
