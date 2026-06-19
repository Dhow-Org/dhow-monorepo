/**
 * Protocol-wide constants mirrored from the on-chain contracts.
 * Keep these in sync with packages/contracts.
 */

export const SCORE = {
  MIN: 0,
  MAX: 1000,
  INITIAL: 500,
} as const;

/** Basis points denominator (100% = 10_000). */
export const BPS = 10_000;

/** Hard cap on the financing fee, mirrored from FinancingPool.MAX_FEE_BPS. */
export const MAX_FEE_BPS = 3_000;

/** On-chain AccessControl role names (the string pre-image of the keccak role ids). */
export const ROLES = {
  REGISTRAR: "REGISTRAR_ROLE",
  VERIFIER: "VERIFIER_ROLE",
  FINANCER: "FINANCER_ROLE",
  OPERATOR: "OPERATOR_ROLE",
  FUNDER: "FUNDER_ROLE",
  ATTESTER: "ATTESTER_ROLE",
} as const;

/** Reputation tier thresholds (inclusive lower bounds), mirrored from ReputationRegistry.tierOf. */
export const TIER_THRESHOLDS = {
  SILVER: 300,
  GOLD: 600,
  PLATINUM: 850,
} as const;
