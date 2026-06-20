import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { Address } from "viem";
import { tierForScore } from "@dhow/shared";
import { AppConfigService } from "../config/config.service";
import { PrismaService } from "../prisma/prisma.service";
import { ChainService } from "../chain/chain.service";

const CHAIN_ADVANCE_STATUS: Record<number, "ACTIVE" | "REPAID" | "DEFAULTED"> = {
  1: "ACTIVE",
  2: "REPAID",
  3: "DEFAULTED",
};

/**
 * Reconciles DB advances against on-chain truth so the off-chain record reflects
 * repayments/defaults that happen out-of-band (e.g. a buyer repaying directly).
 * A polling reconciler; a log-streaming indexer is a later optimisation.
 */
@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly chain: ChainService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get("INDEXER_ENABLED")) {
      this.logger.log("indexer disabled");
      return;
    }
    const interval = this.config.get("INDEXER_INTERVAL_MS");
    this.timer = setInterval(() => {
      void this.reconcile().catch((err) => this.logger.error(`reconcile failed: ${String(err)}`));
    }, interval);
    this.logger.log(`indexer polling every ${interval}ms`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async reconcile(): Promise<{ checked: number; updated: number }> {
    const active = await this.prisma.advance.findMany({
      where: { status: "ACTIVE", onChainId: { not: null } },
      include: { sme: true },
    });

    let updated = 0;
    for (const adv of active) {
      if (adv.onChainId === null) continue;
      const onChain = await this.chain.getAdvanceOnChain(adv.onChainId);
      const dbStatus = CHAIN_ADVANCE_STATUS[onChain.status] ?? "ACTIVE";
      if (onChain.repaid === adv.repaid && dbStatus === adv.status) continue;

      await this.prisma.advance.update({
        where: { id: adv.id },
        data: { repaid: onChain.repaid, status: dbStatus },
      });
      if (dbStatus === "REPAID") {
        await this.prisma.invoice.update({ where: { id: adv.invoiceId }, data: { status: "REPAID" } });
      } else if (dbStatus === "DEFAULTED") {
        await this.prisma.invoice.update({ where: { id: adv.invoiceId }, data: { status: "DEFAULTED" } });
      }
      if (dbStatus !== "ACTIVE") {
        const score = await this.chain.getScore(adv.sme.wallet as Address);
        await this.prisma.reputationSnapshot.create({
          data: { smeId: adv.smeId, score, tier: tierForScore(score) },
        });
      }
      updated += 1;
    }
    return { checked: active.length, updated };
  }
}
