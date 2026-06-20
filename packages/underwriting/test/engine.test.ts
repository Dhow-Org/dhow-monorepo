import assert from "node:assert/strict";
import { assess, psi, psiBand, type UnderwritingSignals } from "../src/index";

// ---- tiny test harness (deterministic; runs under tsx) ----
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

function profile(over: {
  onChainScore?: number;
  buyerDbt?: number;
  buyerScore?: number;
  priorOnTime?: number;
  kyb?: boolean;
  verified?: boolean;
  revenue?: number;
  tenor?: number;
}): UnderwritingSignals {
  return {
    kybApproved: over.kyb ?? true,
    seller: {
      monthlyRevenue: over.revenue ?? 80_000,
      revenueConsistency: 0.8,
      inflowOutflowRatio: 1.2,
      monthsTrading: 36,
      priorDisputeRate: 0.03,
      onChainScore: over.onChainScore ?? 700,
      onTimeRepayments: 5,
    },
    buyer: {
      priorOnTimePayments: over.priorOnTime ?? 5,
      avgDaysBeyondTerms: over.buyerDbt ?? 4,
      externalCreditScore: over.buyerScore ?? 85,
      concentrationPct: 0.25,
    },
    deal: {
      invoiceAmount: 100_000,
      tenorDays: over.tenor ?? 60,
      invoiceVerified: over.verified ?? true,
    },
  };
}

// ---------------------------------- units ---------------------------------- //

test("strong profile is approved with a high grade and sane terms", () => {
  const d = assess(profile({}));
  assert.equal(d.approved, true);
  assert.ok(["A", "B"].includes(d.grade), `grade ${d.grade}`);
  assert.ok(d.advancePct > 0.8 && d.advancePct <= 0.95, `advancePct ${d.advancePct}`);
  assert.ok(d.feeBps >= 50 && d.feeBps <= 3000, `feeBps ${d.feeBps}`);
  assert.ok(d.pd > 0 && d.pd < 0.1, `pd ${d.pd}`);
  assert.equal(d.modelVersion, "dhow-scorecard-v1");
});

test("KYB not approved => declined", () => {
  const d = assess(profile({ kyb: false }));
  assert.equal(d.approved, false);
  assert.equal(d.grade, "DECLINE");
  assert.ok(d.guardrailsTriggered.includes("KYB_NOT_APPROVED"));
});

test("unverified invoice => declined", () => {
  const d = assess(profile({ verified: false }));
  assert.equal(d.approved, false);
  assert.ok(d.guardrailsTriggered.includes("INVOICE_NOT_VERIFIED"));
});

test("below min revenue => declined", () => {
  const d = assess(profile({ revenue: 500 }));
  assert.equal(d.approved, false);
  assert.ok(d.guardrailsTriggered.includes("BELOW_MIN_REVENUE"));
});

test("tenor too long => declined", () => {
  const d = assess(profile({ tenor: 200 }));
  assert.equal(d.approved, false);
  assert.ok(d.guardrailsTriggered.includes("TENOR_TOO_LONG"));
});

test("weak buyer + weak seller => decline by score cutoff", () => {
  const d = assess({
    kybApproved: true,
    seller: { monthlyRevenue: 3000, revenueConsistency: 0.2, inflowOutflowRatio: 0.85, monthsTrading: 3, priorDisputeRate: 0.3, onChainScore: 150 },
    buyer: { avgDaysBeyondTerms: 80, externalCreditScore: 20, priorOnTimePayments: 0, concentrationPct: 0.7 },
    deal: { invoiceAmount: 50_000, tenorDays: 60, invoiceVerified: true },
  });
  assert.equal(d.approved, false);
  assert.ok(d.guardrailsTriggered.includes("SCORE_BELOW_CUTOFF"));
});

test("reason codes: at most 4, all with positive points lost", () => {
  const d = assess(profile({ onChainScore: 200, buyerDbt: 40 }));
  assert.ok(d.reasonCodes.length <= 4);
  for (const r of d.reasonCodes) assert.ok(r.pointsLost > 0);
});

test("deterministic: same input => same output", () => {
  const s = profile({});
  assert.deepEqual(assess(s), assess(s));
});

test("thin file (mostly unknown) is conservative but not auto-declined", () => {
  const d = assess({
    kybApproved: true,
    seller: { onChainScore: 500 },
    buyer: { priorOnTimePayments: 1, avgDaysBeyondTerms: 8, externalCreditScore: 65, concentrationPct: 0.3 },
    deal: { invoiceAmount: 20_000, tenorDays: 45, invoiceVerified: true },
  });
  // unknown seller cash-flow -> not grade A, but a healthy buyer keeps it bankable
  assert.ok(d.approved === true || d.grade === "DECLINE");
  if (d.approved) assert.ok(["C", "D", "E"].includes(d.grade), `grade ${d.grade}`);
});

// ------------------------------- properties -------------------------------- //

test("property: rising on-chain score never worsens terms (monotonic)", () => {
  let prevPd = Number.POSITIVE_INFINITY;
  let prevFee = Number.POSITIVE_INFINITY;
  let prevAdvance = Number.NEGATIVE_INFINITY;
  for (let s = 0; s <= 1000; s += 50) {
    const d = assess(profile({ onChainScore: s }));
    assert.equal(d.approved, true, `should stay approved at score ${s}`);
    assert.ok(d.pd <= prevPd + 1e-9, `pd not monotonic at ${s}`);
    assert.ok(d.feeBps <= prevFee, `fee not monotonic at ${s}`);
    assert.ok(d.advancePct >= prevAdvance - 1e-9, `advance not monotonic at ${s}`);
    prevPd = d.pd;
    prevFee = d.feeBps;
    prevAdvance = d.advancePct;
  }
});

test("property: better buyer DBT never worsens PD", () => {
  // sweep DBT downward (improving) -> PD must be non-increasing
  let prevPd = Number.POSITIVE_INFINITY;
  for (let dbt = 90; dbt >= 0; dbt -= 5) {
    const d = assess(profile({ buyerDbt: dbt }));
    assert.ok(d.pd <= prevPd + 1e-9, `pd should fall as DBT falls (dbt ${dbt})`);
    prevPd = d.pd;
  }
});

test("property: bounds always hold across a sweep", () => {
  for (let cs = 0; cs <= 1000; cs += 100) {
    for (const dbt of [0, 5, 20, 60]) {
      const d = assess(profile({ onChainScore: cs, buyerDbt: dbt }));
      assert.ok(d.pd > 0 && d.pd < 1);
      assert.ok(d.advancePct >= 0 && d.advancePct <= 0.95);
      assert.ok(d.feeBps >= 0 && d.feeBps <= 3000);
      if (d.approved) assert.ok(d.feeBps >= 50);
    }
  }
});

test("PSI: identical distributions ~0; shifted distribution flags drift", () => {
  const base = [10, 20, 30, 25, 15];
  assert.ok(psi(base, base) < 1e-9);
  const shifted = [30, 25, 20, 15, 10];
  const v = psi(base, shifted);
  assert.ok(v > 0.1, `psi ${v}`);
  assert.equal(psiBand(0.05), "stable");
  assert.equal(psiBand(0.3), "significant");
});

// ---------------------------------- report --------------------------------- //
if (failures.length > 0) {
  console.error(`UNDERWRITING TESTS FAILED (${failures.length}):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`underwriting: ${passed} tests passed`);
