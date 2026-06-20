import { Injectable } from "@nestjs/common";
import type { Address } from "viem";
import { ChainService } from "../chain/chain.service";

@Injectable()
export class FundersService {
  constructor(private readonly chain: ChainService) {}

  getFunder(wallet: string) {
    return this.chain.getFunder(wallet as Address);
  }

  getPoolStats() {
    return this.chain.getPoolStats();
  }
}
