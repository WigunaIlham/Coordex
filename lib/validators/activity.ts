import { z } from "zod";

import { ACTIVITY_CATEGORIES } from "@/lib/constants";

const CategoryEnum = z.enum(
  ACTIVITY_CATEGORIES as unknown as readonly [string, ...string[]]
);

export const createActivitySchema = z.object({
  title: z.string().min(1, "Judul wajib diisi").max(200),
  content: z.string().min(1, "Konten wajib diisi").max(5000),
  category: CategoryEnum.default("Lainnya"),
  isMilestone: z.boolean().default(false),
});

export const updateActivitySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  category: CategoryEnum.optional(),
  isMilestone: z.boolean().optional(),
});

export const activityQuerySchema = z.object({
  category: z.string().optional(),
  authorId: z.string().optional(),
  isMilestone: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
