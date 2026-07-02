import { z } from "zod";

export const connectSchema = z.object({
  entityId: z.string().min(1).max(200),
});
export type ConnectBody = z.infer<typeof connectSchema>;
