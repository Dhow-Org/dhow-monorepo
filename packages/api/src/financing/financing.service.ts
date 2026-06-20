import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Address } from "viem";
import { BPS, tierForScore } from "@dhow/shared";
import { assess, type Decision } from "@dhow/underwriting";
import { PrismaService } from "../prisma/prisma.service";
import { ChainService } from "../chain/chain.service";
import { SignalsService } from "./signals.service";
import type { DisburseBody } from "./financing.dto";

const USDC_DECIMALS = 6;
const toBaseUnits = (human: number): bigint => BigInt(Math.round(human * 10 ** USDC_DECIMALS));

@Injectable()
export class FinancingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ChainService,
    private readonly signals: SignalsService,
  ) {}

  /** Preview the underwriting decision for an invoice without disbursing. */
  async assess(invoiceId: string, requestedAdvancePct?: number): Promise<Decision> {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { sme: true } });
    return assess(await this.signals.buildForInvoice(invoice, requestedAdvancePct));
  }

  /** Underwrite, then disburse the engine-decided advance against a verified invoice. */
  async disburse(invoiceId: string, body: DisburseBody) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { advance: true, sme: true },
    });
    if (invoice.advance) throw new ConflictException("invoice already financed");
    if (invoice.onChainId == null) throw new BadRequestException("invoice is not on-chain");
    if (invoice.status !== "VERIFIED") throw new BadRequestException(`invoice not verified (status ${invoice.status})`);

    const decision = assess(await this.signals.buildForInvoice(invoice, body.requestedAdvancePct));

    if (!decision.approved) {
      await this.recordDecision(invoice.id, null, decision);
      throw new BadRequestException({
        message: "underwriting declined",
        grade: decision.grade,
        reasonCodes: decision.reasonCodes,
        guardrails: decision.guardrailsTriggered,
      });
    }

    const advanceAmount = toBaseUnits(decision.advanceAmount);
    const { txHash, onChainId } = await this.chain.disburse({
      invoiceOnChainId: invoice.onChainId,
      advanceAmount,
      feeBps: decision.feeBps,
    });
    const feeAmount = (advanceAmount * BigInt(decision.feeBps)) / BigInt(BPS);

    const advance = await this.prisma.advance.create({
      data: {
        onChainId,
        invoiceId: invoice.id,
        smeId: invoice.smeId,
        principal: advanceAmount.toString(),
        feeAmount: feeAmount.toString(),
        dueDate: invoice.dueDate,
        status: "ACTIVE",
        disburseTx: txHash,
        disbursedAt: new Date(),
      },
    });
    await this.prisma.invoice.update({ where: { id: invoice.id }, data: { status: "FINANCED" } });
    await this.recordDecision(invoice.id, advance.id, decision);
    await this.snapshotReputation(invoice.smeId);

    return {
      advance,
      decision: {
        grade: decision.grade,
        pd: decision.pd,
        advancePct: decision.advancePct,
        feeBps: decision.feeBps,
        reasonCodes: decision.reasonCodes,
      },
    };
  }

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

  private async recordDecision(invoiceId: string, advanceId: string | null, decision: Decision): Promise<void> {
    await this.prisma.underwritingDecision.create({
      data: {
        invoiceId,
        advanceId,
        approved: decision.approved,
        grade: decision.grade,
        pd: decision.pd,
        advancePct: decision.advancePct,
        feeBps: decision.feeBps,
        reasonCodes: decision.reasonCodes as unknown as Prisma.InputJsonValue,
        trace: decision.trace as unknown as Prisma.InputJsonValue,
        modelVersion: decision.modelVersion,
        policyVersion: decision.policyVersion,
      },
    });
  }

  private async snapshotReputation(smeId: string): Promise<void> {
    const sme = await this.prisma.sme.findUniqueOrThrow({ where: { id: smeId } });
    const score = await this.chain.getScore(sme.wallet as Address);
    await this.prisma.reputationSnapshot.create({ data: { smeId, score, tier: tierForScore(score) } });
  }
}
