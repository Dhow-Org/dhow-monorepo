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
    // getScore returns the protocol's initial score (500) for a fresh wallet,
    // whereas the raw struct is all-zero until first initialised — use getScore
    // for the authoritative score/tier.
    const [onChain, score] = await Promise.all([
      this.chain.getReputation(wallet as Address),
      this.chain.getScore(wallet as Address),
    ]);
    const sme = await this.prisma.sme.findUnique({ where: { wallet: wallet.toLowerCase() } });
    const history = sme
      ? await this.prisma.reputationSnapshot.findMany({
          where: { smeId: sme.id },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [];
    return { wallet: wallet.toLowerCase(), ...onChain, score, tier: tierForScore(score), history };
  }
}
