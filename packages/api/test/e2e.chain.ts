/**
 * Chain-level end-to-end test: exercises the real ChainService against a live
 * Anvil node with freshly-deployed contracts. Proves the full loop:
 *   register -> verify -> disburse -> repay -> on-chain score increases.
 *
 * Env (supplied by scripts/e2e.sh after deploy): RPC_URL, CHAIN_ID,
 * OPERATOR_PRIVATE_KEY, *_ADDRESS, plus dummies for JWT_SECRET/DATABASE_URL.
 */
import "reflect-metadata";
import assert from "node:assert/strict";
import { keccak256, toHex, type Address } from "viem";
import { validateEnv } from "../src/config/env";
import type { AppConfigService } from "../src/config/config.service";
import { ChainService } from "../src/chain/chain.service";

// Anvil default account #1 (acts as the SME / receivable supplier).
const SUPPLIER: Address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

async function main(): Promise<void> {
  const env = validateEnv(process.env);
  const config = { get: (k: keyof typeof env) => env[k] } as unknown as AppConfigService;
  const chain = new ChainService(config);

  const dueDate = BigInt(Math.floor(Date.now() / 1000) + 60 * 24 * 3600); // +60 days
  const externalRef = "INV-E2E-001";

  // 1) register
  const { onChainId: invoiceId } = await chain.registerInvoice({
    supplier: SUPPLIER,
    debtor: SUPPLIER,
    asset: chain.addresses.usdc,
    amount: 10_000_000000n, // 10,000 USDC (6dp)
    dueDate,
    externalRef: keccak256(toHex(externalRef)),
    docHash: keccak256(toHex("doc-e2e")),
  });
  assert.equal(await chain.getInvoiceStatus(invoiceId), 1, "invoice should be Registered (1)");

  // 2) verify
  await chain.verifyInvoice(invoiceId);
  assert.equal(await chain.getInvoiceStatus(invoiceId), 2, "invoice should be Verified (2)");

  // 3) disburse 85% advance @ 2% fee
  const { onChainId: advanceId } = await chain.disburse({
    invoiceOnChainId: invoiceId,
    advanceAmount: 8_500_000000n,
    feeBps: 200,
  });
  const scoreBefore = await chain.getScore(SUPPLIER);

  // 4) repay in full (principal 8,500 + fee 170), on time
  await chain.repay({ advanceOnChainId: advanceId, amount: 8_670_000000n });
  assert.equal(await chain.getInvoiceStatus(invoiceId), 4, "invoice should be Repaid (4)");

  // 5) reputation increased by the on-time bonus (+20)
  const scoreAfter = await chain.getScore(SUPPLIER);
  assert.equal(scoreAfter, scoreBefore + 20, "on-time repayment should add 20 to the score");

  console.log(
    `E2E OK  invoice=${invoiceId} advance=${advanceId} score ${scoreBefore} -> ${scoreAfter}`,
  );
}

main().catch((err) => {
  console.error("E2E FAILED:", err);
  process.exit(1);
});
