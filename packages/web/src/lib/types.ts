import type { Decision } from "@dhow/underwriting";

export type { Decision };

export interface InvoiceRow {
  id: string;
  onChainId: number | null;
  amount: string; // base units
  debtor: string | null;
  dueDate: string;
  status: "REGISTERED" | "VERIFIED" | "FINANCED" | "REPAID" | "DEFAULTED" | "CANCELLED";
  externalRef: string;
  createdAt: string;
  advance?: AdvanceRow | null;
}

export interface AdvanceRow {
  id: string;
  onChainId: number | null;
  principal: string;
  feeAmount: string;
  repaid: string;
  status: "ACTIVE" | "REPAID" | "DEFAULTED";
  dueDate: string;
}

export interface PoolStats {
  idleLiquidity: string;
  outstandingPrincipal: string;
  totalFunderPrincipal: string;
  totalLosses: string;
}

export interface ReputationView {
  wallet: string;
  score: number;
  tier: number;
  financedCount: number;
  onTimeCount: number;
  lateCount: number;
  defaultCount: number;
}

export interface DisburseResult {
  advance: AdvanceRow;
  decision: Pick<Decision, "grade" | "pd" | "advancePct" | "feeBps" | "reasonCodes">;
}
