import { Injectable } from "@nestjs/common";
import type { Address } from "viem";
import { tierForScore } from "@dhow/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ChainService } from "../chain/chain.service";

@Injectable()
export class ReputationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ChainService,
  ) {}

  /** On-chain cash-flow score + tier, plus the off-chain snapshot history for charts. */
  async get(wallet: string) {
    const onChain = await this.chain.getReputation(wallet as Address);
    const sme = await this.prisma.sme.findUnique({ where: { wallet: wallet.toLowerCase() } });
    const history = sme
      ? await this.prisma.reputationSnapshot.findMany({
          where: { smeId: sme.id },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [];
    return { wallet: wallet.toLowerCase(), ...onChain, tier: tierForScore(onChain.score), history };
  }
}
