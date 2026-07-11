/**
 * Rebuild the off-chain database from on-chain truth.
 *
 * The chain is the source of truth for invoices, advances and repayments. This
 * script walks the InvoiceRegistry and FinancingPool (ids are sequential, so no
 * event-log range limits are needed) and reconstructs the DB rows, then enriches
 * them with transaction hashes pulled from the explorer API.
 *
 * Usage:
 *   DATABASE_URL=... RPC_URL=... ETHERSCAN_API_KEY=... \
 *   INVOICE_REGISTRY_ADDRESS=... FINANCING_POOL_ADDRESS=... \
 *   pnpm --filter @dhow/api exec tsx scripts/sync-from-chain.ts
 */
import { PrismaClient } from "@prisma/client";
import { createPublicClient, http, type Address } from "viem";
import { polygonAmoy } from "viem/chains";
import { InvoiceRegistryAbi } from "../src/chain/abis/InvoiceRegistry";
import { FinancingPoolAbi } from "../src/chain/abis/FinancingPool";

const prisma = new PrismaClient();

const RPC = process.env.RPC_URL ?? "https://rpc-amoy.polygon.technology";
const REGISTRY = process.env.INVOICE_REGISTRY_ADDRESS as Address;
const POOL = process.env.FINANCING_POOL_ADDRESS as Address;
const USDC = (process.env.USDC_ADDRESS ?? "") as Address;
const API_KEY = process.env.ETHERSCAN_API_KEY ?? "";
const CHAIN_ID = 80002;

const client = createPublicClient({ chain: polygonAmoy, transport: http(RPC) });

// on-chain enums
const INVOICE_STATUS = ["NONE", "REGISTERED", "VERIFIED", "FINANCED", "REPAID", "DEFAULTED", "CANCELLED"] as const;
const ADVANCE_STATUS = ["NONE", "ACTIVE", "REPAID", "DEFAULTED"] as const;

/** Pull event logs from the explorer API (no block-range limit, unlike the public RPC). */
async function fetchLogs(address: string, topic0: string): Promise<Array<{ topics: string[]; transactionHash: string }>> {
  if (!API_KEY) return [];
  const url =
    `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}&module=logs&action=getLogs` +
    `&address=${address}&fromBlock=0&toBlock=latest&topic0=${topic0}&apikey=${API_KEY}`;
  try {
    const res = await fetch(url);
    const json = (await res.json()) as { status: string; result: unknown };
    if (json.status !== "1" || !Array.isArray(json.result)) return [];
    return json.result as Array<{ topics: string[]; transactionHash: string }>;
  } catch {
    return [];
  }
}

const topicId = (log: { topics: string[] }, i: number): number => Number(BigInt(log.topics[i] ?? "0x0"));

async function main() {
  console.log(`Syncing from chain ${CHAIN_ID}\n  registry: ${REGISTRY}\n  pool:     ${POOL}\n`);

  // ---- tx hashes by id, from the explorer ----
  // InvoiceRegistered(uint256 indexed id, ...)  |  AdvanceDisbursed(uint256 indexed advanceId, ...)
  // RepaymentReceived(uint256 indexed advanceId, ...)
  const [regLogs, disLogs, repLogs] = await Promise.all([
    fetchLogs(REGISTRY, "0xc70503442c621a3f7096feb83145dd8482cb4c1a5c274e435f1fa3a6c1f513c7"), // InvoiceRegistered
    fetchLogs(POOL, "0x562cde86e506ea29f64d309ed7e4fb83b771b53f23b329a7af244b6fee1fa497"), // AdvanceDisbursed
    fetchLogs(POOL, "0x9b4568b7aa4f12be9ecabfae89e1d1885c23877819acceb5b1f25738ffd9f75e"), // RepaymentReceived
  ]);
  const registerTxById = new Map<number, string>();
  const disburseTxById = new Map<number, string>();
  const repayTxById = new Map<number, string>();
  for (const l of regLogs) registerTxById.set(topicId(l, 1), l.transactionHash);
  for (const l of disLogs) disburseTxById.set(topicId(l, 1), l.transactionHash);
  for (const l of repLogs) repayTxById.set(topicId(l, 1), l.transactionHash);
  console.log(`explorer: registerTx=${registerTxById.size} disburseTx=${disburseTxById.size} repayTx=${repayTxById.size}`);

  // ---- invoices: walk sequential ids until one is unknown ----
  const invoiceDbIdByChainId = new Map<number, string>();
  let created = 0;
  for (let id = 1; id <= 500; id++) {
    let inv: {
      supplier: Address; debtor: Address; asset: Address; amount: bigint;
      dueDate: bigint; createdAt: bigint; status: number; docHash: string; externalRef: string;
    };
    try {
      inv = (await client.readContract({
        address: REGISTRY, abi: InvoiceRegistryAbi, functionName: "getInvoice", args: [BigInt(id)],
      })) as typeof inv;
    } catch {
      console.log(`\ninvoices: stopped at id ${id} (does not exist). ${id - 1} found.`);
      break;
    }
    if (Number(inv.status) === 0) break;

    const wallet = inv.supplier.toLowerCase();
    const status = INVOICE_STATUS[Number(inv.status)] as
      | "REGISTERED" | "VERIFIED" | "FINANCED" | "REPAID" | "DEFAULTED" | "CANCELLED";

    // ops verification also clears KYB in our flow; mirror that for verified+ invoices
    const kyb = Number(inv.status) >= 2 ? "APPROVED" : "PENDING";
    const sme = await prisma.sme.upsert({
      where: { wallet },
      update: { kybStatus: kyb },
      create: { wallet, kybStatus: kyb },
    });

    // externalRef is stored HASHED on-chain, so the original text is unrecoverable.
    // Reconstruct a readable, unique reference from the on-chain id.
    const externalRef = `INV-${String(id).padStart(4, "0")}`;
    const zero = "0x0000000000000000000000000000000000000000";

    const row = await prisma.invoice.upsert({
      where: { onChainId: id },
      update: { status },
      create: {
        onChainId: id,
        smeId: sme.id,
        debtor: inv.debtor.toLowerCase() === zero ? null : inv.debtor.toLowerCase(),
        asset: inv.asset || USDC,
        amount: inv.amount.toString(),
        dueDate: new Date(Number(inv.dueDate) * 1000),
        status,
        externalRef,
        docHash: inv.docHash,
        registerTx: registerTxById.get(id) ?? null,
        createdAt: new Date(Number(inv.createdAt) * 1000),
      },
    });
    invoiceDbIdByChainId.set(id, row.id);
    created++;
    console.log(`  invoice #${id}  ${status.padEnd(9)} ${(Number(inv.amount) / 1e6).toLocaleString()} USDC  sme=${wallet.slice(0, 8)}…`);
  }

  // ---- advances ----
  let adv = 0;
  for (let id = 1; id <= 500; id++) {
    const a = (await client.readContract({
      address: POOL, abi: FinancingPoolAbi, functionName: "getAdvance", args: [BigInt(id)],
    })) as {
      invoiceId: bigint; sme: Address; principal: bigint; feeAmount: bigint;
      dueDate: bigint; repaid: bigint; status: number; disbursedAt: bigint;
    };
    if (Number(a.status) === 0) {
      console.log(`\nadvances: stopped at id ${id}. ${id - 1} found.`);
      break;
    }
    const invDbId = invoiceDbIdByChainId.get(Number(a.invoiceId));
    if (!invDbId) continue;
    const wallet = a.sme.toLowerCase();
    const sme = await prisma.sme.upsert({ where: { wallet }, update: {}, create: { wallet } });
    const status = ADVANCE_STATUS[Number(a.status)] as "ACTIVE" | "REPAID" | "DEFAULTED";

    await prisma.advance.upsert({
      where: { onChainId: id },
      update: { status, repaid: a.repaid.toString(), repayTx: repayTxById.get(id) ?? undefined },
      create: {
        onChainId: id,
        invoiceId: invDbId,
        smeId: sme.id,
        principal: a.principal.toString(),
        feeAmount: a.feeAmount.toString(),
        dueDate: new Date(Number(a.dueDate) * 1000),
        repaid: a.repaid.toString(),
        status,
        disburseTx: disburseTxById.get(id) ?? null,
        disbursedAt: new Date(Number(a.disbursedAt) * 1000),
        repayTx: repayTxById.get(id) ?? null,
      },
    });
    adv++;
    console.log(`  advance #${id}  ${status.padEnd(9)} principal=${(Number(a.principal) / 1e6).toLocaleString()} fee=${(Number(a.feeAmount) / 1e6).toLocaleString()}`);
  }

  console.log(`\n✅ synced ${created} invoices, ${adv} advances from chain.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("sync failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
