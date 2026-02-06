import { z } from "zod";

export const emailSchema = z.string().email().toLowerCase();
export const passwordSchema = z.string().min(8).max(128);

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const contactStatusSchema = z.enum(["lead", "customer", "inactive"]);

export const contactCreateSchema = z.object({
  display_name: z.string().min(1).max(255),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  tags: z.array(z.string().max(50)).optional().nullable(),
  status: contactStatusSchema.optional().nullable(),
  external_ref: z.record(z.any()).optional().nullable(),
});

export const interactionTypeSchema = z.enum([
  "note",
  "invoice",
  "payment",
  "call",
  "visit",
]);

export const interactionCreateSchema = z.object({
  type: interactionTypeSchema,
  payload: z.record(z.any()).optional().nullable(),
  occurred_at: z.string().datetime().optional().nullable(),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
