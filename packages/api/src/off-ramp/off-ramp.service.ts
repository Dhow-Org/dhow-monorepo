import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../config/config.service";
import { FuzeProvider, type PayoutResult } from "./fuze.provider";
import { quoteAed, type AedQuote } from "./off-ramp.quote";

@Injectable()
export class OffRampService {
  constructor(
    private readonly config: AppConfigService,
    private readonly fuze: FuzeProvider,
  ) {}

  quote(amountUsdc: number): AedQuote {
    return quoteAed(amountUsdc, this.config.get("AED_RATE"), this.config.get("OFFRAMP_FEE_BPS"), this.fuze.name);
  }

  async payout(amountUsdc: number, beneficiary: string): Promise<PayoutResult & { quote: AedQuote }> {
    const quote = this.quote(amountUsdc);
    const result = await this.fuze.payout(amountUsdc, quote.amountAed, beneficiary);
    return { ...result, quote };
  }
}
