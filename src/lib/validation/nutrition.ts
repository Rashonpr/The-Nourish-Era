import { z } from "zod";

export const foodSearchQuerySchema = z.object({
  q: z.string().trim().min(2, "Enter at least 2 characters").max(200),
});

export const cacheFoodSchema = z.object({
  externalId: z.string().trim().min(1).max(50),
});
