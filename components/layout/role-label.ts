import type { Role } from "@/lib/generated/prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  KETUA: "Ketua",
  SEKRETARIS: "Sekretaris",
  BENDAHARA: "Bendahara",
  PJ_PDD: "PJ PDD",
  ANGGOTA_PDD: "Anggota PDD",
  PJ_KONSUMSI: "PJ Konsumsi",
  PJ_ACARA: "PJ Acara",
  ANGGOTA_ACARA: "Anggota Acara",
  PJ_HUMLOG: "PJ Humlog",
  ANGGOTA_HUMLOG: "Anggota Humlog",
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({
  value: value as Role,
  label,
}));
