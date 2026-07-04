// Role-Based Access Control (RBAC) — permission matrix.
//
// This is a code-based matrix, not a DB table: fast, easy to review, single
// source of truth. Every guard on the server or UI toggle should ask
// `hasPermission(role, ...)` — never string-compare roles directly.

import type { Role } from "@/lib/generated/prisma/client";

export type Permission =
  // Views
  | "dashboard.view"
  | "tugas.view"
  | "keuangan.view"
  | "rab.view"
  | "dokumen.view"
  | "rapat.view"
  | "konsumsi.view"
  | "repositori.view"
  | "profil.view"

  // CRUD data
  | "tugas.crud"
  | "aktivitas.crud"
  | "stres.respond"
  | "stres.manage"
  | "konflik.report"
  | "konflik.manage"
  | "keuangan.crud"
  | "keuangan.approve"
  | "rab.crud"
  | "rab.approve"
  | "dokumen.crud"
  | "dokumen.crudFinance"
  | "rapat.crud"
  | "konsumsi.manage"

  // Modul lain
  | "media.crud"
  | "program.crud"
  | "pemangku.crud"
  | "qna.crud"

  // Repository
  | "repositori.crud"
  | "repositori.upload"

  // Admin
  | "admin.users"
  | "admin.roles"
  | "admin.permissions"
  | "admin.reports"
  | "admin.config";

// Permissions every logged-in user always has.
// Kebijakan sekarang:
//   - Semua user bisa VIEW semua fitur (kecuali pusat konflik).
//   - CRUD dibatasi per role:
//       * Keuangan → BENDAHARA
//       * Media → PDD (PJ + Anggota)
//       * Program → Acara (PJ + Anggota)
//       * Jadwal (Konsumsi/Piket) + Pemangku → HumLog (PJ + Anggota)
//       * Rapat → SEKRETARIS
//   - Beberapa hal terbuka untuk semua: tugas, aktivitas, dokumen, RAB, QnA,
//     repositori.
const DEFAULTS: Permission[] = [
  // Views (semua user bisa lihat)
  "dashboard.view",
  "tugas.view",
  "keuangan.view",
  "rab.view",
  "dokumen.view",
  "rapat.view",
  "konsumsi.view",
  "repositori.view",
  "profil.view",

  // CRUD terbuka untuk semua anggota
  "tugas.crud",
  "aktivitas.crud",
  "stres.respond",
  "konflik.report",
  "rab.crud",
  "dokumen.crud",
  "repositori.crud",
  "repositori.upload",
  "qna.crud",
  "program.crud",
];

// Role → extra permissions on top of DEFAULTS. Super Admin bypasses the map.
const ROLE_EXTRA: Record<Exclude<Role, "SUPER_ADMIN">, Permission[]> = {
  // Ketua tetap punya oversight semua modul + otoritas approve
  KETUA: [
    "keuangan.crud",
    "keuangan.approve",
    "rab.approve",
    "media.crud",
    "program.crud",
    "konsumsi.manage",
    "pemangku.crud",
    "rapat.crud",
    "konflik.manage",
    "stres.manage",
    "dokumen.crudFinance",
  ],
  SEKRETARIS: ["rapat.crud"],
  BENDAHARA: ["keuangan.crud", "dokumen.crudFinance"],

  // PDD
  PJ_PDD: ["media.crud"],
  ANGGOTA_PDD: ["media.crud"],

  // Acara — program CRUD sudah di DEFAULTS (semua user)
  PJ_ACARA: [],
  ANGGOTA_ACARA: [],

  // HumLog — kelola jadwal (konsumsi+piket) + pemangku kepentingan
  PJ_HUMLOG: ["konsumsi.manage", "pemangku.crud"],
  ANGGOTA_HUMLOG: ["konsumsi.manage", "pemangku.crud"],

  // Konsumsi (kalau ada role terpisah untuk operasional konsumsi) —
  // dibiarkan tanpa CRUD khusus. Rotasi konsumsi/piket dipegang HumLog.
  PJ_KONSUMSI: [],
};

export function permissionsOf(role: Role): Permission[] {
  if (role === "SUPER_ADMIN") return ALL_PERMISSIONS;
  return [...DEFAULTS, ...(ROLE_EXTRA[role] ?? [])];
}

export function hasPermission(role: Role, perm: Permission): boolean {
  if (role === "SUPER_ADMIN") return true;
  const list = ROLE_EXTRA[role] ?? [];
  return DEFAULTS.includes(perm) || list.includes(perm);
}

export function hasAnyPermission(role: Role, perms: Permission[]): boolean {
  return perms.some((p) => hasPermission(role, p));
}

// Convenience: Super Admin OR Ketua.
export function isAdminOrKetua(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "KETUA";
}

export function canApprove(role: Role): boolean {
  return isAdminOrKetua(role);
}

// Explicit full list used for Super Admin fast-path.
const ALL_PERMISSIONS: Permission[] = [
  "dashboard.view",
  "tugas.view",
  "keuangan.view",
  "rab.view",
  "dokumen.view",
  "rapat.view",
  "konsumsi.view",
  "repositori.view",
  "profil.view",
  "tugas.crud",
  "aktivitas.crud",
  "stres.respond",
  "stres.manage",
  "konflik.report",
  "konflik.manage",
  "keuangan.crud",
  "keuangan.approve",
  "rab.crud",
  "rab.approve",
  "dokumen.crud",
  "dokumen.crudFinance",
  "rapat.crud",
  "konsumsi.manage",
  "media.crud",
  "program.crud",
  "pemangku.crud",
  "qna.crud",
  "repositori.crud",
  "repositori.upload",
  "admin.users",
  "admin.roles",
  "admin.permissions",
  "admin.reports",
  "admin.config",
];
