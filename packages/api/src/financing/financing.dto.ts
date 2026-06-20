import { z } from "zod";
import { tokenAmountSchema, MAX_FEE_BPS } from "@dhow/shared";

export const disburseBodySchema = z.object({
  advanceAmount: tokenAmountSchema,
  feeBps: z.number().int().min(0).max(MAX_FEE_BPS),
});
export type DisburseBody = z.infer<typeof disburseBodySchema>;

export const repayBodySchema = z.object({
  amount: tokenAmountSchema,
});
export type RepayBody = z.infer<typeof repayBodySchema>;
