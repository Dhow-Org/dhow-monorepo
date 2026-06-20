export const fmtUsd = (n: number, dp = 0): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: dp }).format(n);

export const fmtPct = (frac: number, dp = 1): string => `${(frac * 100).toFixed(dp)}%`;

export const bpsToPct = (bps: number): number => bps / 10_000;

export const shortAddr = (a?: string | null): string => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

/** USDC base units (6dp, stringified) -> human number. */
export const fromBaseUnits = (base: string): number => Number(BigInt(base)) / 1e6;

export const daysUntil = (iso: string): number =>
  Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000));
