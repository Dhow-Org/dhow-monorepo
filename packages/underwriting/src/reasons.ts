import { REASON_TEXT } from "./policy";
import type { CardResult, ReasonCode } from "./types";

/** Adverse-action style reason codes: the features that lost the most points. */
export function reasonCodes(cards: CardResult[], max = 4): ReasonCode[] {
  return cards
    .flatMap((c) => c.contributions)
    .map((c) => ({
      code: c.feature.toUpperCase().replace(/\./g, "_"),
      feature: c.feature,
      description: REASON_TEXT[c.feature] ?? c.feature,
      pointsLost: c.maxPoints - c.points,
    }))
    .filter((r) => r.pointsLost > 0)
    .sort((a, b) => b.pointsLost - a.pointsLost)
    .slice(0, max);
}
