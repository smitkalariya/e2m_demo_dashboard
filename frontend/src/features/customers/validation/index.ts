import { z } from "zod";

export const customerStatusOptions = ["prospect", "active", "inactive", "churned"] as const;

export const customerFormSchema = z.object({
  company_name: z.string().min(1, "Company name is required").max(255),
  contact_name: z.string().min(1, "Contact name is required").max(255),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().max(50).optional().or(z.literal("")),
  status: z.enum(customerStatusOptions),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
