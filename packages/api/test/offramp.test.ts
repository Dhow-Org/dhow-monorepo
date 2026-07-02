import assert from "node:assert/strict";
import { quoteAed } from "../src/off-ramp/off-ramp.quote";

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

test("USDC -> AED at the peg, net of fee", () => {
  const q = quoteAed(85_000, 3.6725, 40, "fuze"); // 40 bps
  // 85000 * 3.6725 = 312162.5; * (1 - 0.004) = 310913.85
  assert.equal(q.amountAed, 310913.85);
  assert.equal(q.rate, 3.6725);
});

test("zero fee = gross", () => {
  const q = quoteAed(1000, 3.6725, 0, "fuze");
  assert.equal(q.amountAed, 3672.5);
});

if (failures.length > 0) {
  console.error(`OFF-RAMP TESTS FAILED (${failures.length}):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`off-ramp: ${passed} tests passed`);
