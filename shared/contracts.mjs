import { z } from "zod";
export const intentSchema = z
  .object({
    actions: z
      .array(z.enum(["triage", "research", "draft", "tag"]))
      .min(1)
      .max(4),
    objective: z.string().max(200),
  })
  .strict();
