/**
 * Turns a bank transaction history into the underwriting engine's cash-flow
 * signals. Pure and deterministic — this is the logic that lets the engine
 * price on real money movement instead of conservative "unknown" bins.
 */

export interface NormalizedTxn {
  amount: number; // positive magnitude
  type: "credit" | "debit";
  date: Date;
}

export interface CashflowSignals {
  monthlyRevenue: number;
  revenueConsistency: number; // 0..1 (1 = very stable)
  inflowOutflowRatio: number;
  monthsTrading: number;
}

export function transactionsToSignals(txns: NormalizedTxn[]): CashflowSignals | null {
  if (txns.length === 0) return null;

  const creditsByMonth = new Map<string, number>();
  const activeMonths = new Set<string>();
  let totalCredits = 0;
  let totalDebits = 0;

  for (const t of txns) {
    const key = `${t.date.getUTCFullYear()}-${t.date.getUTCMonth()}`;
    activeMonths.add(key);
    if (t.type === "credit") {
      creditsByMonth.set(key, (creditsByMonth.get(key) ?? 0) + t.amount);
      totalCredits += t.amount;
    } else {
      totalDebits += t.amount;
    }
  }

  const monthlyCredits = [...creditsByMonth.values()];
  const mean = monthlyCredits.length > 0 ? monthlyCredits.reduce((a, b) => a + b, 0) / monthlyCredits.length : 0;
  const variance =
    monthlyCredits.length > 0
      ? monthlyCredits.reduce((a, b) => a + (b - mean) ** 2, 0) / monthlyCredits.length
      : 0;
  const cov = mean > 0 ? Math.sqrt(variance) / mean : 1;

  const inflowOutflowRatio = totalDebits > 0 ? totalCredits / totalDebits : totalCredits > 0 ? 2 : 0;

  return {
    monthlyRevenue: Math.round(mean),
    revenueConsistency: Number(Math.max(0, Math.min(1, 1 - cov)).toFixed(3)),
    inflowOutflowRatio: Number(inflowOutflowRatio.toFixed(3)),
    monthsTrading: activeMonths.size,
  };
}
