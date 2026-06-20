import type { Bin } from "./policy";

/** Map a value to its bin's points; missing/NaN -> the conservative missing bin. */
export function binPoints(value: number | undefined, bins: Bin[], missingPoints: number): number {
  if (value === undefined || value === null || Number.isNaN(value)) return missingPoints;
  for (const bin of bins) {
    if (value <= bin.upTo) return bin.points;
  }
  return bins[bins.length - 1]?.points ?? missingPoints;
}

export function maxPoints(bins: Bin[]): number {
  return bins.reduce((m, b) => Math.max(m, b.points), 0);
}
