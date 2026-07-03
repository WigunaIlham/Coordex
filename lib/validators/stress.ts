import { z } from "zod";

const Score = z
  .number({ error: "Wajib diisi" })
  .int()
  .min(1, "Minimal 1")
  .max(5, "Maksimal 5");

const dateOrIso = z
  .string()
  .datetime({ offset: true })
  .or(z.string().date())
  .transform((v) => new Date(v));

export const createSurveySchema = z
  .object({
    weekNumber: z.number().int().min(1).max(20),
    surveyDate: dateOrIso,
    opensAt: dateOrIso,
    closesAt: dateOrIso,
  })
  .refine((v) => v.closesAt.getTime() > v.opensAt.getTime(), {
    path: ["closesAt"],
    message: "Tanggal tutup harus setelah tanggal buka",
  });

export const updateSurveyWindowSchema = z
  .object({
    opensAt: dateOrIso.optional(),
    closesAt: dateOrIso.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (v) => !(v.opensAt && v.closesAt) || v.closesAt.getTime() > v.opensAt.getTime(),
    { path: ["closesAt"], message: "Tanggal tutup harus setelah tanggal buka" },
  );

export const submitResponseSchema = z.object({
  fatigueScore: Score,
  motivationScore: Score,
  sleepScore: Score,
  conflictPerception: Score,
  stressLevel: Score,
  notes: z.string().max(2000).optional(),
});

export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
