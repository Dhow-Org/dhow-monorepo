/**
 * Domain types shared across the API and web app. On-chain enums mirror the
 * Solidity contracts exactly (same ordinal values).
 */

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

/** Mirrors InvoiceRegistry.Status. */
export enum InvoiceStatus {
  None = 0,
  Registered = 1,
  Verified = 2,
  Financed = 3,
  Repaid = 4,
  Defaulted = 5,
  Cancelled = 6,
}

/** Mirrors FinancingPool.AdvanceStatus. */
export enum AdvanceStatus {
  None = 0,
  Active = 1,
  Repaid = 2,
  Defaulted = 3,
}

/** Mirrors ReputationRegistry.tierOf return value. */
export enum ReputationTier {
  Bronze = 0,
  Silver = 1,
  Gold = 2,
  Platinum = 3,
}

/**
 * Amounts crossing process/HTTP boundaries are carried as decimal integer
 * strings in token base units (e.g. USDC has 6 decimals) to avoid bigint/JSON
 * precision loss. Convert to bigint only at the chain boundary.
 */
export type TokenAmount = string;

export interface InvoiceView {
  /** Off-chain DB id. */
  id: string;
  /** On-chain invoice id once registered. */
  onChainId: number | null;
  supplier: Address;
  debtor: Address | null;
  asset: Address;
  amount: TokenAmount;
  /** Unix seconds. */
  dueDate: number;
  status: InvoiceStatus;
  docHash: Hex;
  externalRef: string;
  createdAt: string;
}

export interface AdvanceView {
  id: string;
  onChainId: number | null;
  invoiceId: string;
  sme: Address;
  principal: TokenAmount;
  feeAmount: TokenAmount;
  dueDate: number;
  repaid: TokenAmount;
  status: AdvanceStatus;
  disbursedAt: string | null;
}

export interface ReputationView {
  sme: Address;
  score: number;
  tier: ReputationTier;
  financedCount: number;
  onTimeCount: number;
  lateCount: number;
  defaultCount: number;
}

export function tierForScore(score: number): ReputationTier {
  if (score >= 850) return ReputationTier.Platinum;
  if (score >= 600) return ReputationTier.Gold;
  if (score >= 300) return ReputationTier.Silver;
  return ReputationTier.Bronze;
}
