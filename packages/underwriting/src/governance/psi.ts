/**
 * Population Stability Index — model-monitoring utility (not part of a decision).
 * Compares a baseline distribution to a live one to detect drift.
 *   < 0.10  stable | 0.10-0.25 some shift | > 0.25 significant shift.
 */
export function psi(expected: number[], actual: number[]): number {
  if (expected.length !== actual.length) {
    throw new Error("PSI: distributions must have the same number of bins");
  }
  const eps = 1e-6;
  const eSum = expected.reduce((a, b) => a + b, 0) || 1;
  const aSum = actual.reduce((a, b) => a + b, 0) || 1;
  let total = 0;
  for (let i = 0; i < expected.length; i++) {
    const e = Math.max(eps, (expected[i] ?? 0) / eSum);
    const a = Math.max(eps, (actual[i] ?? 0) / aSum);
    total += (a - e) * Math.log(a / e);
  }
  return total;
}

export function psiBand(value: number): "stable" | "shift" | "significant" {
  if (value < 0.1) return "stable";
  if (value < 0.25) return "shift";
  return "significant";
}
