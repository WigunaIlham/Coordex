import { z } from "zod";

export const KNOWLEDGE_FOLDERS = [
  "Umum",
  "Kegiatan",
  "Keuangan",
  "Dokumentasi",
  "Referensi",
] as const;

export const createKnowledgeMetaSchema = z.object({
  title: z.string().min(1, "Judul wajib").max(200),
  description: z.string().max(2000).optional().nullable(),
  folder: z.enum(KNOWLEDGE_FOLDERS).default("Umum"),
  tags: z.array(z.string().min(1).max(30)).max(10).default([]),
});

export const updateKnowledgeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  folder: z.enum(KNOWLEDGE_FOLDERS).optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
});
