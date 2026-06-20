import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import type { Address } from "viem";
import { BPS, tierForScore } from "@dhow/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ChainService } from "../chain/chain.service";
import type { DisburseBody } from "./financing.dto";

@Injectable()
export class FinancingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ChainService,
  ) {}

  /** Disburse a receivable advance against a verified invoice. */
  async disburse(invoiceId: string, body: DisburseBody) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { advance: true },
    });
    if (invoice.advance) throw new ConflictException("invoice already financed");
    if (invoice.onChainId == null) throw new BadRequestException("invoice is not on-chain");
    if (invoice.status !== "VERIFIED") throw new BadRequestException(`invoice not verified (status ${invoice.status})`);

    const advanceAmount = BigInt(body.advanceAmount);
    const { txHash, onChainId } = await this.chain.disburse({
      invoiceOnChainId: invoice.onChainId,
      advanceAmount,
      feeBps: body.feeBps,
    });
    const feeAmount = (advanceAmount * BigInt(body.feeBps)) / BigInt(BPS);

    const advance = await this.prisma.advance.create({
      data: {
        onChainId,
        invoiceId: invoice.id,
        smeId: invoice.smeId,
        principal: body.advanceAmount,
        feeAmount: feeAmount.toString(),
        dueDate: invoice.dueDate,
        status: "ACTIVE",
        disburseTx: txHash,
        disbursedAt: new Date(),
      },
    });
    await this.prisma.invoice.update({ where: { id: invoice.id }, data: { status: "FINANCED" } });
    await this.snapshotReputation(invoice.smeId);
    return advance;
  }

  /** Record a repayment (operator-escrow), updating principal/fee settlement state. */
  async repay(advanceId: string, amount: string) {
    const advance = await this.prisma.advance.findUniqueOrThrow({ where: { id: advanceId } });
    if (advance.status !== "ACTIVE") throw new BadRequestException(`advance not active (status ${advance.status})`);
    if (advance.onChainId == null) throw new BadRequestException("advance is not on-chain");

    const txHash = await this.chain.repay({ advanceOnChainId: advance.onChainId, amount: BigInt(amount) });
    await this.prisma.repayment.create({
      data: { advanceId: advance.id, amount, payer: this.chain.operator.address, txHash },
    });

    const totalDue = BigInt(advance.principal) + BigInt(advance.feeAmount);
    const nextRepaid = BigInt(advance.repaid) + BigInt(amount);
    const cappedRepaid = nextRepaid > totalDue ? totalDue : nextRepaid;
    const fullyRepaid = cappedRepaid >= totalDue;

    await this.prisma.advance.update({
      where: { id: advance.id },
      data: { repaid: cappedRepaid.toString(), status: fullyRepaid ? "REPAID" : "ACTIVE" },
    });
    if (fullyRepaid) {
      await this.prisma.invoice.update({ where: { id: advance.invoiceId }, data: { status: "REPAID" } });
    }
    await this.snapshotReputation(advance.smeId);
    return this.prisma.advance.findUniqueOrThrow({ where: { id: advance.id } });
  }

  /** Mark an advance defaulted (overdue), realising the loss on-chain. */
  async recordDefault(advanceId: string) {
    const advance = await this.prisma.advance.findUniqueOrThrow({ where: { id: advanceId } });
    if (advance.status !== "ACTIVE") throw new BadRequestException(`advance not active (status ${advance.status})`);
    if (advance.onChainId == null) throw new BadRequestException("advance is not on-chain");

    await this.chain.recordDefault(advance.onChainId);
    await this.prisma.advance.update({ where: { id: advance.id }, data: { status: "DEFAULTED" } });
    await this.prisma.invoice.update({ where: { id: advance.invoiceId }, data: { status: "DEFAULTED" } });
    await this.snapshotReputation(advance.smeId);
    return this.prisma.advance.findUniqueOrThrow({ where: { id: advance.id } });
  }

  get(id: string) {
    return this.prisma.advance.findUniqueOrThrow({ where: { id }, include: { repayments: true, invoice: true } });
  }

  /** Read the SME's on-chain cash-flow score and snapshot it off-chain for the UI. */
  private async snapshotReputation(smeId: string): Promise<void> {
    const sme = await this.prisma.sme.findUniqueOrThrow({ where: { id: smeId } });
    const score = await this.chain.getScore(sme.wallet as Address);
    await this.prisma.reputationSnapshot.create({ data: { smeId, score, tier: tierForScore(score) } });
  }
}
