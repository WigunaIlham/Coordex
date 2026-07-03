import { z } from "zod";

export const ConflictCategoryEnum = z.enum([
  "BEBAN_KERJA",
  "KOMUNIKASI",
  "INTERPERSONAL",
  "LAINNYA",
]);

export const ConflictStatusEnum = z.enum(["OPEN", "DISKUSI", "SELESAI"]);

export const createConflictSchema = z.object({
  category: ConflictCategoryEnum,
  description: z.string().min(10, "Deskripsi minimal 10 karakter").max(5000),
  isAnonymous: z.boolean().default(true),
});

export const updateConflictStatusSchema = z.object({
  status: ConflictStatusEnum,
  resolutionNotes: z.string().max(5000).optional().nullable(),
});

export type CreateConflictInput = z.infer<typeof createConflictSchema>;

export const CONFLICT_CATEGORY_LABELS = {
  BEBAN_KERJA: "Beban Kerja",
  KOMUNIKASI: "Komunikasi",
  INTERPERSONAL: "Interpersonal",
  LAINNYA: "Lainnya",
} as const;

export const CONFLICT_STATUS_LABELS = {
  OPEN: "Baru",
  DISKUSI: "Dalam Diskusi",
  SELESAI: "Selesai",
} as const;
