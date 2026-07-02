import { Injectable, Logger } from "@nestjs/common";
import { AppConfigService } from "../config/config.service";

export interface PayoutResult {
  status: "submitted" | "pending-credentials" | string;
  reference?: string;
}

/** Adapter over a licensed off-ramp partner (Fuze) that pays out AED to a beneficiary. */
@Injectable()
export class FuzeProvider {
  readonly name = "fuze";
  private readonly logger = new Logger(FuzeProvider.name);

  constructor(private readonly config: AppConfigService) {}

  get configured(): boolean {
    return this.config.get("OFFRAMP_API_URL").length > 0;
  }

  async payout(amountUsdc: number, amountAed: number, beneficiary: string): Promise<PayoutResult> {
    if (!this.configured) return { status: "pending-credentials" };
    try {
      const res = await fetch(`${this.config.get("OFFRAMP_API_URL")}/payouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": this.config.get("OFFRAMP_API_KEY") },
        body: JSON.stringify({
          source_amount: amountUsdc,
          source_currency: "USDC",
          target_currency: "AED",
          target_amount: amountAed,
          beneficiary,
        }),
      });
      if (!res.ok) {
        this.logger.warn(`off-ramp payout returned ${res.status}`);
        return { status: `error-${res.status}` };
      }
      const data = (await res.json()) as { id?: string };
      return { status: "submitted", reference: data.id };
    } catch (err) {
      this.logger.warn(`off-ramp payout failed: ${String(err)}`);
      return { status: "error" };
    }
  }
}
