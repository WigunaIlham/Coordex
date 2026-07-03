import { z } from "zod";

export const StakeholderCategoryEnum = z.enum([
  "RT",
  "RW",
  "PKK",
  "KARANG_TARUNA",
  "MASJID",
  "PERANGKAT_DESA",
  "POKJA",
  "LAINNYA",
]);

export const createStakeholderSchema = z.object({
  name: z.string().min(1, "Nama wajib").max(200),
  category: StakeholderCategoryEnum,
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateStakeholderSchema = createStakeholderSchema.partial();

export const addHistorySchema = z.object({
  summary: z.string().min(1, "Ringkasan wajib").max(2000),
  date: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .transform((v) => new Date(v)),
});

export const STAKEHOLDER_CATEGORY_LABELS = {
  RT: "RT",
  RW: "RW",
  PKK: "PKK",
  KARANG_TARUNA: "Karang Taruna",
  MASJID: "Masjid",
  PERANGKAT_DESA: "Perangkat Desa",
  POKJA: "Pokja",
  LAINNYA: "Lainnya",
} as const;
