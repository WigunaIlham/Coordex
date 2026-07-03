import { z } from "zod";

export const MediaTypeEnum = z.enum(["FOTO", "VIDEO"]);
export const MediaStatusEnum = z.enum([
  "DRAFT",
  "EDITING",
  "APPROVED",
  "PUBLISHED",
]);

export const updateMediaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  caption: z.string().max(2000).nullable().optional(),
  event: z.string().max(200).nullable().optional(),
  status: MediaStatusEnum.optional(),
});

export const MEDIA_TYPE_LABELS = {
  FOTO: "Foto",
  VIDEO: "Video",
} as const;

export const MEDIA_STATUS_LABELS = {
  DRAFT: "Draft",
  EDITING: "Editing",
  APPROVED: "Approved",
  PUBLISHED: "Published",
} as const;
