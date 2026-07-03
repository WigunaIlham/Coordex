import { z } from "zod";

export const RiskCategoryEnum = z.enum([
  "CUACA",
  "ANGGARAN",
  "KESEHATAN",
  "KONFLIK",
  "JADWAL",
  "LAINNYA",
]);
export const RiskLevelEnum = z.enum(["RENDAH", "SEDANG", "TINGGI"]);
export const RiskStatusEnum = z.enum(["AKTIF", "DIMITIGASI", "TERJADI"]);

export const createRiskSchema = z.object({
  title: z.string().min(1, "Judul wajib").max(200),
  category: RiskCategoryEnum,
  probability: RiskLevelEnum,
  impact: RiskLevelEnum,
  mitigationPlan: z.string().max(2000).optional().nullable(),
});

export const updateRiskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: RiskCategoryEnum.optional(),
  probability: RiskLevelEnum.optional(),
  impact: RiskLevelEnum.optional(),
  mitigationPlan: z.string().max(2000).nullable().optional(),
  status: RiskStatusEnum.optional(),
});

export const RISK_CATEGORY_LABELS = {
  CUACA: "Cuaca",
  ANGGARAN: "Anggaran",
  KESEHATAN: "Kesehatan",
  KONFLIK: "Konflik",
  JADWAL: "Jadwal",
  LAINNYA: "Lainnya",
} as const;

export const RISK_LEVEL_LABELS = {
  RENDAH: "Rendah",
  SEDANG: "Sedang",
  TINGGI: "Tinggi",
} as const;

export const RISK_STATUS_LABELS = {
  AKTIF: "Aktif",
  DIMITIGASI: "Dimitigasi",
  TERJADI: "Terjadi",
} as const;
