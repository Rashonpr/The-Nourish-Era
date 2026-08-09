import { z } from "zod";

export const addProgressEntrySchema = z.object({
  entryDate: z.string().min(1, "Pick a date"),
  weightKg: z.coerce.number().positive().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  adherencePct: z.coerce.number().int().min(0).max(100).optional(),
  hungerRating: z.coerce.number().int().min(1).max(5).optional(),
  energyRating: z.coerce.number().int().min(1).max(5).optional(),
  practitionerNotes: z.string().trim().max(2000).optional(),
});
export type AddProgressEntryInput = z.infer<typeof addProgressEntrySchema>;
