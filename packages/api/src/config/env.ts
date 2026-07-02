import { z } from "zod";

const hexAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "must be a 0x EVM address");

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  CHAIN_ID: z.coerce.number().int().positive(),
  RPC_URL: z.string().url(),
  OPERATOR_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "must be 0x + 64 hex chars"),
  INVOICE_REGISTRY_ADDRESS: hexAddress,
  FINANCING_POOL_ADDRESS: hexAddress,
  REPUTATION_REGISTRY_ADDRESS: hexAddress,
  USDC_ADDRESS: hexAddress,
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("1d"),
  /** Comma-separated wallet addresses allowed to call operator/ops endpoints. */
  OPS_ADDRESSES: z.string().default(""),
  /** Set to "false" to disable the background reconciliation poller. */
  INDEXER_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),
  INDEXER_INTERVAL_MS: z.coerce.number().int().positive().default(15_000),
  // Open finance (Lean). Empty token => the engine falls back to conservative bins.
  LEAN_APP_TOKEN: z.string().default(""),
  LEAN_BASE_URL: z.string().default("https://sandbox.leantech.me"),
  // Off-ramp (USDC -> AED via a licensed partner, e.g. Fuze). AED is USD-pegged.
  AED_RATE: z.coerce.number().positive().default(3.6725),
  OFFRAMP_FEE_BPS: z.coerce.number().int().min(0).max(1000).default(40),
  OFFRAMP_API_URL: z.string().default(""),
  OFFRAMP_API_KEY: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

/** Used by @nestjs/config to fail fast on missing/invalid configuration. */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
