import { z } from "zod";

export const AchievementTypeEnum = z.enum([
  "ARTIKEL",
  "VIDEO",
  "BERITA",
  "LAINNYA",
]);

export const createAchievementSchema = z.object({
  type: AchievementTypeEnum,
  title: z.string().min(1, "Judul wajib").max(200),
  url: z.string().url("URL tidak valid").max(500).optional().or(z.literal("")),
  publishedDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
});

export const updateTargetSchema = z.object({
  type: AchievementTypeEnum,
  targetCount: z.number().int().min(0),
  description: z.string().max(200).optional().nullable(),
});

export const ACHIEVEMENT_TYPE_LABELS = {
  ARTIKEL: "Artikel",
  VIDEO: "Video",
  BERITA: "Berita",
  LAINNYA: "Lainnya",
} as const;
