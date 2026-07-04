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
// Kebijakan: semua user bisa view + kontribusi (CRUD) semua modul non-sensitif.
// Yang tetap khusus:
//   - konflik.manage (butuh Ketua)
//   - stres.manage (butuh Ketua)
//   - keuangan.approve / rab.approve (butuh Ketua)
//   - admin.* (butuh SUPER_ADMIN)
const DEFAULTS: Permission[] = [
  "dashboard.view",
  "tugas.view",
  "tugas.crud",
  "aktivitas.crud",
  "stres.respond",
  "konflik.report",
  "keuangan.view",
  "keuangan.crud",
  "rab.view",
  "rab.crud",
  "dokumen.view",
  "dokumen.crud",
  "dokumen.crudFinance",
  "rapat.view",
  "rapat.crud",
  "konsumsi.view",
  "konsumsi.manage",
  "repositori.view",
  "repositori.crud",
  "repositori.upload",
  "profil.view",
  "media.crud",
  "program.crud",
  "pemangku.crud",
  "qna.crud",
];

// Role → extra permissions on top of DEFAULTS. Super Admin bypasses the map.
// Sekarang lebih ramping karena mayoritas capability sudah di DEFAULTS.
const ROLE_EXTRA: Record<Exclude<Role, "SUPER_ADMIN">, Permission[]> = {
  KETUA: [
    "konflik.manage",
    "stres.manage",
    "keuangan.approve",
    "rab.approve",
  ],
  SEKRETARIS: [],
  BENDAHARA: [],
  PJ_PDD: [],
  ANGGOTA_PDD: [],
  PJ_KONSUMSI: [],
  PJ_ACARA: [],
  ANGGOTA_ACARA: [],
  PJ_HUMLOG: [],
  ANGGOTA_HUMLOG: [],
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
