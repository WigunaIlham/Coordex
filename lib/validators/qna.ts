import { z } from "zod";

export const createQuestionSchema = z.object({
  title: z.string().min(3, "Minimal 3 karakter").max(300),
  body: z.string().max(5000).optional().nullable(),
});

export const updateQuestionSchema = z.object({
  title: z.string().min(3).max(300).optional(),
  body: z.string().max(5000).nullable().optional(),
});

export const createAnswerSchema = z.object({
  body: z.string().min(1, "Isi jawaban wajib").max(5000),
});
