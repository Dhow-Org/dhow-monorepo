import assert from "node:assert/strict";
import { transactionsToSignals, type NormalizedTxn } from "../src/open-finance/cashflow";

let passed = 0;
const failures: string[] = [];
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message}`);
  }
}

test("empty history -> null (engine falls back to conservative bins)", () => {
  assert.equal(transactionsToSignals([]), null);
});

test("computes monthly revenue, ratio, and months from steady flow", () => {
  const txns: NormalizedTxn[] = [
    { amount: 10000, type: "credit", date: new Date("2026-01-15") },
    { amount: 4000, type: "debit", date: new Date("2026-01-20") },
    { amount: 12000, type: "credit", date: new Date("2026-02-15") },
    { amount: 6000, type: "debit", date: new Date("2026-02-20") },
    { amount: 11000, type: "credit", date: new Date("2026-03-15") },
  ];
  const s = transactionsToSignals(txns)!;
  assert.equal(s.monthsTrading, 3);
  assert.equal(s.monthlyRevenue, 11000); // (10000 + 12000 + 11000) / 3
  assert.ok(s.revenueConsistency > 0.85, `consistency ${s.revenueConsistency}`);
  assert.ok(Math.abs(s.inflowOutflowRatio - 3.3) < 0.01, `ratio ${s.inflowOutflowRatio}`); // 33000 / 10000
});

test("volatile revenue -> low consistency", () => {
  const txns: NormalizedTxn[] = [
    { amount: 1000, type: "credit", date: new Date("2026-01-15") },
    { amount: 20000, type: "credit", date: new Date("2026-02-15") },
    { amount: 500, type: "credit", date: new Date("2026-03-15") },
  ];
  assert.ok(transactionsToSignals(txns)!.revenueConsistency < 0.4);
});

test("credits only -> ratio capped at 2", () => {
  const s = transactionsToSignals([{ amount: 5000, type: "credit", date: new Date("2026-01-15") }])!;
  assert.equal(s.inflowOutflowRatio, 2);
});

if (failures.length > 0) {
  console.error(`CASHFLOW TESTS FAILED (${failures.length}):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`open-finance cashflow: ${passed} tests passed`);
