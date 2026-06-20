import { Injectable } from "@nestjs/common";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEventLogs,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { AppConfigService } from "../config/config.service";
import { InvoiceRegistryAbi } from "./abis/InvoiceRegistry";
import { FinancingPoolAbi } from "./abis/FinancingPool";
import { ReputationRegistryAbi } from "./abis/ReputationRegistry";
import { Erc20Abi } from "./abis/Erc20";

interface ChainAddresses {
  invoiceRegistry: Address;
  financingPool: Address;
  reputationRegistry: Address;
  usdc: Address;
}

/**
 * The single point of contact with the chain. Reads via a public client and
 * sends operator transactions via a wallet client. Underwriting decides the
 * numbers off-chain; this service only enforces/settles them on-chain.
 */
@Injectable()
export class ChainService {
  private readonly chain: Chain;
  private readonly publicClient: PublicClient;
  private readonly walletClient: WalletClient;
  readonly operator: PrivateKeyAccount;
  readonly addresses: ChainAddresses;

  constructor(config: AppConfigService) {
    const rpcUrl = config.get("RPC_URL");
    this.chain = defineChain({
      id: config.get("CHAIN_ID"),
      name: `chain-${config.get("CHAIN_ID")}`,
      nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    });
    this.operator = privateKeyToAccount(config.get("OPERATOR_PRIVATE_KEY") as Hex);
    this.publicClient = createPublicClient({ chain: this.chain, transport: http(rpcUrl) });
    this.walletClient = createWalletClient({ account: this.operator, chain: this.chain, transport: http(rpcUrl) });
    this.addresses = {
      invoiceRegistry: config.get("INVOICE_REGISTRY_ADDRESS") as Address,
      financingPool: config.get("FINANCING_POOL_ADDRESS") as Address,
      reputationRegistry: config.get("REPUTATION_REGISTRY_ADDRESS") as Address,
      usdc: config.get("USDC_ADDRESS") as Address,
    };
  }

  // ----------------------------- Invoice registry ----------------------------

  async registerInvoice(p: {
    supplier: Address;
    debtor: Address;
    asset: Address;
    amount: bigint;
    dueDate: bigint;
    externalRef: Hex;
    docHash: Hex;
  }): Promise<{ txHash: Hex; onChainId: number }> {
    const txHash = await this.walletClient.writeContract({
      address: this.addresses.invoiceRegistry,
      abi: InvoiceRegistryAbi,
      functionName: "registerInvoice",
      args: [p.supplier, p.debtor, p.asset, p.amount, p.dueDate, p.externalRef, p.docHash],
      account: this.operator,
      chain: this.chain,
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    const events = parseEventLogs({ abi: InvoiceRegistryAbi, eventName: "InvoiceRegistered", logs: receipt.logs });
    const id = events[0]?.args?.id;
    if (id === undefined) throw new Error("InvoiceRegistered event not found in receipt");
    return { txHash, onChainId: Number(id) };
  }

  async verifyInvoice(onChainId: number): Promise<Hex> {
    return this.walletClient.writeContract({
      address: this.addresses.invoiceRegistry,
      abi: InvoiceRegistryAbi,
      functionName: "verifyInvoice",
      args: [BigInt(onChainId)],
      account: this.operator,
      chain: this.chain,
    });
  }

  async getInvoiceStatus(onChainId: number): Promise<number> {
    const inv = (await this.publicClient.readContract({
      address: this.addresses.invoiceRegistry,
      abi: InvoiceRegistryAbi,
      functionName: "getInvoice",
      args: [BigInt(onChainId)],
    })) as unknown as { status: number };
    return Number(inv.status);
  }

  // ------------------------------ Financing pool ------------------------------

  async disburse(p: {
    invoiceOnChainId: number;
    advanceAmount: bigint;
    feeBps: number;
  }): Promise<{ txHash: Hex; onChainId: number }> {
    const txHash = await this.walletClient.writeContract({
      address: this.addresses.financingPool,
      abi: FinancingPoolAbi,
      functionName: "disburse",
      args: [BigInt(p.invoiceOnChainId), p.advanceAmount, BigInt(p.feeBps)],
      account: this.operator,
      chain: this.chain,
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    const events = parseEventLogs({ abi: FinancingPoolAbi, eventName: "AdvanceDisbursed", logs: receipt.logs });
    const id = events[0]?.args?.advanceId;
    if (id === undefined) throw new Error("AdvanceDisbursed event not found in receipt");
    return { txHash, onChainId: Number(id) };
  }

  /** Operator-escrow model: make sure the pool can pull `amount` USDC from the operator. */
  async ensureUsdcApproval(amount: bigint): Promise<void> {
    const allowance = (await this.publicClient.readContract({
      address: this.addresses.usdc,
      abi: Erc20Abi,
      functionName: "allowance",
      args: [this.operator.address, this.addresses.financingPool],
    })) as bigint;
    if (allowance >= amount) return;
    const txHash = await this.walletClient.writeContract({
      address: this.addresses.usdc,
      abi: Erc20Abi,
      functionName: "approve",
      args: [this.addresses.financingPool, amount],
      account: this.operator,
      chain: this.chain,
    });
    await this.publicClient.waitForTransactionReceipt({ hash: txHash });
  }

  async repay(p: { advanceOnChainId: number; amount: bigint }): Promise<Hex> {
    await this.ensureUsdcApproval(p.amount);
    return this.walletClient.writeContract({
      address: this.addresses.financingPool,
      abi: FinancingPoolAbi,
      functionName: "repay",
      args: [BigInt(p.advanceOnChainId), p.amount],
      account: this.operator,
      chain: this.chain,
    });
  }

  async recordDefault(advanceOnChainId: number): Promise<Hex> {
    return this.walletClient.writeContract({
      address: this.addresses.financingPool,
      abi: FinancingPoolAbi,
      functionName: "recordDefault",
      args: [BigInt(advanceOnChainId)],
      account: this.operator,
      chain: this.chain,
    });
  }

  // ------------------------------- Reputation ---------------------------------

  async getScore(sme: Address): Promise<number> {
    const score = (await this.publicClient.readContract({
      address: this.addresses.reputationRegistry,
      abi: ReputationRegistryAbi,
      functionName: "getScore",
      args: [sme],
    })) as bigint;
    return Number(score);
  }

  async getReputation(
    sme: Address,
  ): Promise<{ score: number; financedCount: number; onTimeCount: number; lateCount: number; defaultCount: number }> {
    const r = (await this.publicClient.readContract({
      address: this.addresses.reputationRegistry,
      abi: ReputationRegistryAbi,
      functionName: "getReputation",
      args: [sme],
    })) as unknown as {
      score: bigint;
      financedCount: bigint;
      onTimeCount: bigint;
      lateCount: bigint;
      defaultCount: bigint;
    };
    return {
      score: Number(r.score),
      financedCount: Number(r.financedCount),
      onTimeCount: Number(r.onTimeCount),
      lateCount: Number(r.lateCount),
      defaultCount: Number(r.defaultCount),
    };
  }

  // ------------------------------ Pool reads ----------------------------------

  async getFunder(funder: Address): Promise<{ principal: string; claimable: string; pendingFees: string }> {
    const f = (await this.publicClient.readContract({
      address: this.addresses.financingPool,
      abi: FinancingPoolAbi,
      functionName: "funderOf",
      args: [funder],
    })) as unknown as { principal: bigint; claimable: bigint };
    const pending = (await this.publicClient.readContract({
      address: this.addresses.financingPool,
      abi: FinancingPoolAbi,
      functionName: "pendingFees",
      args: [funder],
    })) as bigint;
    return { principal: f.principal.toString(), claimable: f.claimable.toString(), pendingFees: pending.toString() };
  }

  async getPoolStats(): Promise<{
    idleLiquidity: string;
    outstandingPrincipal: string;
    totalFunderPrincipal: string;
    totalLosses: string;
  }> {
    const read = (functionName: "idleLiquidity" | "outstandingPrincipal" | "totalFunderPrincipal" | "totalLosses") =>
      this.publicClient.readContract({ address: this.addresses.financingPool, abi: FinancingPoolAbi, functionName });
    const [idle, outstanding, total, losses] = (await Promise.all([
      read("idleLiquidity"),
      read("outstandingPrincipal"),
      read("totalFunderPrincipal"),
      read("totalLosses"),
    ])) as bigint[];
    return {
      idleLiquidity: idle.toString(),
      outstandingPrincipal: outstanding.toString(),
      totalFunderPrincipal: total.toString(),
      totalLosses: losses.toString(),
    };
  }

  async getAdvanceOnChain(
    advanceOnChainId: number,
  ): Promise<{ principal: string; feeAmount: string; repaid: string; status: number }> {
    const a = (await this.publicClient.readContract({
      address: this.addresses.financingPool,
      abi: FinancingPoolAbi,
      functionName: "getAdvance",
      args: [BigInt(advanceOnChainId)],
    })) as unknown as { principal: bigint; feeAmount: bigint; repaid: bigint; status: number };
    return {
      principal: a.principal.toString(),
      feeAmount: a.feeAmount.toString(),
      repaid: a.repaid.toString(),
      status: Number(a.status),
    };
  }
}
