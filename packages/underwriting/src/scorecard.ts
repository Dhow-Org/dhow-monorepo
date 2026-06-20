import { binPoints, maxPoints } from "./binning";
import type { FeatureSpec } from "./policy";
import type { CardResult, FeatureContribution } from "./types";

/** Score one additive scorecard from its feature specs. */
export function scoreCard<S>(name: "debtor" | "seller", input: S, specs: FeatureSpec<S>[]): CardResult {
  const contributions: FeatureContribution[] = specs.map((spec) => {
    const value = spec.extract(input);
    return {
      feature: spec.feature,
      value,
      points: binPoints(value, spec.bins, spec.missingPoints),
      maxPoints: maxPoints(spec.bins),
    };
  });
  const score = contributions.reduce((s, c) => s + c.points, 0);
  const maxScore = contributions.reduce((s, c) => s + c.maxPoints, 0);
  return { name, score, maxScore, norm: maxScore > 0 ? score / maxScore : 0, contributions };
}
