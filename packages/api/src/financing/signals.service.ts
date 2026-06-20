import { Injectable } from "@nestjs/common";
import type { Invoice, Sme } from "@prisma/client";
import type { Address } from "viem";
import type { UnderwritingSignals } from "@dhow/underwriting";
import { PrismaService } from "../prisma/prisma.service";
import { ChainService } from "../chain/chain.service";

const USDC_DECIMALS = 6;
const toHuman = (base: string): number => Number(BigInt(base)) / 10 ** USDC_DECIMALS;

/**
 * Assembles the underwriting signal set for an invoice from what we currently
 * have: on-chain reputation, our own repayment history, and the invoice/buyer
 * record. Cash-flow signals (revenue, consistency, ...) come from Open Finance
 * in Phase 4 — until then they are undefined and the engine uses conservative bins.
 */
@Injectable()
export class SignalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ChainService,
  ) {}

  async buildForInvoice(invoice: Invoice & { sme: Sme }, requestedAdvancePct?: number): Promise<UnderwritingSignals> {
    const onChainScore = await this.chain.getScore(invoice.sme.wallet as Address);
    const onTimeRepayments = await this.prisma.advance.count({
      where: { smeId: invoice.smeId, status: "REPAID" },
    });
    const buyerPriorOnTime = invoice.debtor
      ? await this.prisma.invoice.count({
          where: { smeId: invoice.smeId, debtor: invoice.debtor, status: "REPAID" },
        })
      : undefined;
    const active = await this.prisma.advance.findMany({
      where: { smeId: invoice.smeId, status: "ACTIVE" },
      select: { principal: true },
    });
    const existingExposure = active.reduce((sum, a) => sum + toHuman(a.principal), 0);
    const tenorDays = Math.max(1, Math.round((invoice.dueDate.getTime() - Date.now()) / 86_400_000));

    return {
      kybApproved: invoice.sme.kybStatus === "APPROVED",
      seller: {
        onChainScore,
        onTimeRepayments,
        // revenue / consistency / inflow-outflow / monthsTrading arrive with Open Finance (Phase 4)
      },
      buyer: {
        priorOnTimePayments: buyerPriorOnTime,
      },
      deal: {
        invoiceAmount: toHuman(invoice.amount),
        tenorDays,
        invoiceVerified: invoice.status === "VERIFIED",
        requestedAdvancePct,
      },
      existingExposure,
    };
  }
}
