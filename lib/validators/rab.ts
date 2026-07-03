import { z } from "zod";

export const createRabSchema = z.object({
  title: z.string().min(1, "Judul wajib").max(200),
  description: z.string().max(2000).optional().nullable(),
});

export const updateRabSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib").max(120),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  order: z.number().int().min(0).optional(),
});

const decimalString = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? String(v) : v))
  .refine((v) => /^-?\d+(\.\d+)?$/.test(v) && Number(v) >= 0, {
    message: "Nilai harus angka non-negatif",
  });

export const createItemSchema = z.object({
  name: z.string().min(1, "Nama item wajib").max(200),
  volume: decimalString.default("0"),
  unit: z.string().min(1, "Satuan wajib").max(30),
  unitPrice: decimalString.default("0"),
  notes: z.string().max(500).optional().nullable(),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  volume: decimalString.optional(),
  unit: z.string().min(1).max(30).optional(),
  unitPrice: decimalString.optional(),
  notes: z.string().max(500).nullable().optional(),
  order: z.number().int().min(0).optional(),
});
