import { z } from "zod";

export const interactionFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  notes: z.string().min(1, "Notes cannot be empty"),
  meeting_date: z.string().min(1, "Meeting date is required"),
});

export type InteractionFormValues = z.infer<typeof interactionFormSchema>;
