import { z } from "zod";
import { tokenAmountSchema } from "@dhow/shared";

/** The engine decides advance % and fee; the SME may optionally request a lower advance %. */
export const disburseBodySchema = z.object({
  requestedAdvancePct: z.number().min(0).max(0.95).optional(),
});
export type DisburseBody = z.infer<typeof disburseBodySchema>;

export const repayBodySchema = z.object({
  amount: tokenAmountSchema,
});
export type RepayBody = z.infer<typeof repayBodySchema>;
