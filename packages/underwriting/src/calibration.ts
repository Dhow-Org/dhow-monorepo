import { GRADE_BANDS, PD_ANCHORS } from "./policy";
import type { Grade } from "./types";

const logit = (p: number): number => Math.log(p / (1 - p));
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/**
 * Smooth, monotonic norm -> PD via piecewise-linear interpolation in log-odds
 * between the calibration anchors. Anchors are expert priors (v1) and become
 * data-anchored in v2 — the interpolation is unchanged.
 */
export function calibratePd(norm: number): number {
  const n = Math.max(0, Math.min(1, norm));
  const a = PD_ANCHORS; // descending norm
  for (let i = 0; i < a.length - 1; i++) {
    const hi = a[i]!;
    const lo = a[i + 1]!;
    if (n <= hi.norm && n >= lo.norm) {
      const span = hi.norm - lo.norm;
      const t = span === 0 ? 0 : (n - lo.norm) / span;
      return sigmoid(logit(lo.pd) + t * (logit(hi.pd) - logit(lo.pd)));
    }
  }
  return n >= a[0]!.norm ? a[0]!.pd : a[a.length - 1]!.pd;
}

export function gradeForNorm(norm: number): Grade {
  for (const band of GRADE_BANDS) {
    if (norm >= band.minNorm) return band.grade;
  }
  return "DECLINE";
}
