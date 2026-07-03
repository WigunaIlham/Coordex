import { z } from "zod";

export const ProgramCycleEnum = z.enum([
  "SIKLUS_I",
  "SIKLUS_II",
  "SIKLUS_III",
  "SIKLUS_IV",
]);
export const ProgramStatusEnum = z.enum([
  "RENCANA",
  "BERLANGSUNG",
  "SELESAI",
  "DIBATALKAN",
]);

export const createProgramSchema = z.object({
  cycle: ProgramCycleEnum,
  name: z.string().min(1, "Nama wajib").max(200),
  description: z.string().max(2000).optional().nullable(),
  targetDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
  picId: z.string().min(1, "PIC wajib dipilih"),
});

export const updateProgramSchema = z.object({
  cycle: ProgramCycleEnum.optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  targetDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === null ? null : new Date(v))),
  picId: z.string().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  status: ProgramStatusEnum.optional(),
});

export const PROGRAM_CYCLE_LABELS = {
  SIKLUS_I: "Siklus I",
  SIKLUS_II: "Siklus II",
  SIKLUS_III: "Siklus III",
  SIKLUS_IV: "Siklus IV",
} as const;

export const PROGRAM_STATUS_LABELS = {
  RENCANA: "Rencana",
  BERLANGSUNG: "Berlangsung",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
} as const;
