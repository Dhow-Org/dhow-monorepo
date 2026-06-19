import { z } from "zod";
import { MAX_FEE_BPS } from "./constants";

/** 20-byte EVM address. */
export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "invalid EVM address")
  .transform((v) => v as `0x${string}`);

/** 32-byte hex value (e.g. a document hash). */
export const bytes32Schema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "invalid bytes32 hex")
  .transform((v) => v as `0x${string}`);

/** Non-negative integer carried as a string in token base units. */
export const tokenAmountSchema = z
  .string()
  .regex(/^\d+$/, "must be a non-negative integer string")
  .refine((v) => BigInt(v) > 0n, "must be greater than zero");

/** Unix seconds, must be in the future for new invoices. */
export const futureUnixSecondsSchema = z.number().int().positive();

export const registerInvoiceSchema = z.object({
  supplier: addressSchema,
  debtor: addressSchema.optional(),
  asset: addressSchema,
  amount: tokenAmountSchema,
  dueDate: futureUnixSecondsSchema,
  /** Human-readable real-world reference; hashed to bytes32 on-chain for anti-double-financing. */
  externalRef: z.string().min(1).max(128),
  docHash: bytes32Schema,
});
export type RegisterInvoiceInput = z.infer<typeof registerInvoiceSchema>;

export const disburseSchema = z.object({
  invoiceId: z.number().int().positive(),
  advanceAmount: tokenAmountSchema,
  feeBps: z.number().int().min(0).max(MAX_FEE_BPS),
});
export type DisburseInput = z.infer<typeof disburseSchema>;

export const repaySchema = z.object({
  advanceId: z.number().int().positive(),
  amount: tokenAmountSchema,
});
export type RepayInput = z.infer<typeof repaySchema>;

/** SIWE login verification payload. */
export const siweVerifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "invalid signature hex"),
});
export type SiweVerifyInput = z.infer<typeof siweVerifySchema>;
