import { Injectable, Logger } from "@nestjs/common";
import { AppConfigService } from "../config/config.service";
import type { NormalizedTxn } from "./cashflow";

interface LeanTxn {
  amount?: number | string;
  credit_debit_indicator?: string;
  value_date_time?: string;
  timestamp?: string;
}

/** Adapter over Lean's open-finance Data API (sandbox by default). */
@Injectable()
export class LeanProvider {
  private readonly logger = new Logger(LeanProvider.name);

  constructor(private readonly config: AppConfigService) {}

  get configured(): boolean {
    return this.config.get("LEAN_APP_TOKEN").length > 0;
  }

  /** Fetch + normalise an entity's transactions. Returns [] if unconfigured or on error. */
  async fetchTransactions(entityId: string): Promise<NormalizedTxn[]> {
    if (!this.configured) return [];
    try {
      const res = await fetch(`${this.config.get("LEAN_BASE_URL")}/data/v1/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "lean-app-token": this.config.get("LEAN_APP_TOKEN") },
        body: JSON.stringify({ entity_id: entityId }),
      });
      if (!res.ok) {
        this.logger.warn(`Lean transactions returned ${res.status}`);
        return [];
      }
      const data = (await res.json()) as { payload?: { transactions?: LeanTxn[] } };
      return (data.payload?.transactions ?? []).map(normalise).filter((t): t is NormalizedTxn => t !== null);
    } catch (err) {
      this.logger.warn(`Lean fetch failed: ${String(err)}`);
      return [];
    }
  }
}

function normalise(t: LeanTxn): NormalizedTxn | null {
  const amount = Math.abs(Number(t.amount ?? 0));
  if (!Number.isFinite(amount) || amount === 0) return null;
  const type = (t.credit_debit_indicator ?? "").toUpperCase().startsWith("C") ? "credit" : "debit";
  const dateStr = t.value_date_time ?? t.timestamp;
  return { amount, type, date: dateStr ? new Date(dateStr) : new Date() };
}
