import { Injectable } from "@nestjs/common";
import { LeanProvider } from "./lean.provider";
import { transactionsToSignals, type CashflowSignals } from "./cashflow";

@Injectable()
export class OpenFinanceService {
  constructor(private readonly lean: LeanProvider) {}

  get available(): boolean {
    return this.lean.configured;
  }

  /** Cash-flow signals for an SME's linked bank, or null if not linked / unavailable. */
  async getSignals(entityId: string | null): Promise<CashflowSignals | null> {
    if (!entityId) return null;
    return transactionsToSignals(await this.lean.fetchTransactions(entityId));
  }
}
