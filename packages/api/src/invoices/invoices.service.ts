import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { keccak256, toHex, zeroAddress, type Address } from "viem";
import type { RegisterInvoiceInput } from "@dhow/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ChainService } from "../chain/chain.service";

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ChainService,
  ) {}

  /**
   * Persist the receivable, then register it on-chain. The supplier is always the
   * signed-in wallet — a user can only create receivables they own.
   */
  async create(wallet: string, input: RegisterInvoiceInput) {
    const supplier = wallet.toLowerCase() as Address;
    const sme = await this.prisma.sme.upsert({
      where: { wallet: supplier },
      update: {},
      create: { wallet: supplier },
    });

    const externalRefHash = keccak256(toHex(input.externalRef));
    const { txHash, onChainId } = await this.chain.registerInvoice({
      supplier,
      debtor: (input.debtor ?? zeroAddress) as Address,
      asset: input.asset,
      amount: BigInt(input.amount),
      dueDate: BigInt(input.dueDate),
      externalRef: externalRefHash,
      docHash: input.docHash,
    });

    return this.prisma.invoice.create({
      data: {
        onChainId,
        smeId: sme.id,
        debtor: input.debtor ? input.debtor.toLowerCase() : null,
        asset: input.asset,
        amount: input.amount,
        dueDate: new Date(input.dueDate * 1000),
        externalRef: input.externalRef,
        docHash: input.docHash,
        registerTx: txHash,
        status: "REGISTERED",
      },
    });
  }

  /** Verify the invoice on-chain (ops/KYB attestation) so it becomes financeable. */
  async verify(id: string) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({ where: { id } });
    if (invoice.onChainId == null) throw new BadRequestException("invoice is not on-chain");
    if (invoice.status !== "REGISTERED") throw new BadRequestException(`cannot verify invoice in status ${invoice.status}`);
    await this.chain.verifyInvoice(invoice.onChainId);
    // v1 simplification: ops verifying the invoice also clears the SME's KYB gate.
    // Real flow: KYB is a separate licensed-partner step.
    await this.prisma.sme.update({ where: { id: invoice.smeId }, data: { kybStatus: "APPROVED" } });
    return this.prisma.invoice.update({ where: { id }, data: { status: "VERIFIED" } });
  }

  /** Only the owning wallet's receivables. */
  async listForWallet(wallet: string) {
    const sme = await this.prisma.sme.findUnique({ where: { wallet: wallet.toLowerCase() } });
    if (!sme) return [];
    return this.prisma.invoice.findMany({
      where: { smeId: sme.id },
      orderBy: { createdAt: "desc" },
      include: { advance: true },
    });
  }

  /** Invoices the wallet OWES as the buyer and that are financed (i.e. payable now). */
  async billsForWallet(wallet: string) {
    return this.prisma.invoice.findMany({
      where: { debtor: wallet.toLowerCase(), status: "FINANCED" },
      orderBy: { createdAt: "desc" },
      include: { advance: true },
    });
  }

  /**
   * The buyer paid an advance directly on-chain (from the Bills page); record the
   * repayment tx hash and reconcile status from chain. Only the invoice's debtor may report.
   */
  async reportRepayment(wallet: string, advanceOnChainId: number, txHash: string) {
    const advance = await this.prisma.advance.findFirstOrThrow({
      where: { onChainId: advanceOnChainId },
      include: { invoice: true },
    });
    if (advance.invoice.debtor !== wallet.toLowerCase()) throw new ForbiddenException("not your bill");

    const onChain = await this.chain.getAdvanceOnChain(advanceOnChainId);
    const repaid = onChain.status === 2; // 0 None, 1 Active, 2 Repaid, 3 Defaulted
    await this.prisma.advance.update({
      where: { id: advance.id },
      data: { repayTx: txHash, repaid: onChain.repaid, status: repaid ? "REPAID" : advance.status },
    });
    if (repaid) {
      await this.prisma.invoice.update({ where: { id: advance.invoiceId }, data: { status: "REPAID" } });
    }
    return { recorded: true, repaid };
  }

  /** A single invoice, only if the caller owns it. */
  async getForWallet(wallet: string, id: string) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id },
      include: { advance: true, sme: true },
    });
    if (invoice.sme.wallet !== wallet.toLowerCase()) throw new ForbiddenException("not your invoice");
    return invoice;
  }
}
