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

  // Phase-2 modules
  | "media.crud"
  | "program.crud"
  | "pencapaian.crud"
  | "pemangku.crud"
  | "risiko.crud"

  // Repository
  | "repositori.crud"
  | "repositori.upload"

  // Admin
  | "admin.users"
  | "admin.roles"
  | "admin.permissions"
  | "admin.reports"
  | "admin.config";

// Permissions every logged-in user always has, regardless of role.
const DEFAULTS: Permission[] = [
  "dashboard.view",
  "tugas.view",
  "aktivitas.crud",
  "stres.respond",
  "konflik.report",
  "keuangan.view",
  "rab.view",
  "dokumen.view",
  "rapat.view",
  "konsumsi.view",
  "repositori.view",
  "profil.view",
  // Modul tambahan — akses CRUD dibuka untuk semua user aktif supaya seluruh
  // tim bisa kontribusi (upload foto media, catat pencapaian, log risiko, dll).
  "media.crud",
  "program.crud",
  "pencapaian.crud",
  "pemangku.crud",
  "risiko.crud",
];

// Role → extra permissions on top of DEFAULTS. Super Admin bypasses the map.
const ROLE_EXTRA: Record<Exclude<Role, "SUPER_ADMIN">, Permission[]> = {
  KETUA: [
    "tugas.crud",
    "konflik.manage",
    "stres.manage",
    "keuangan.approve",
    "rab.approve",
    "risiko.crud",
  ],
  SEKRETARIS: [
    "tugas.crud",
    "dokumen.crud",
    "repositori.crud",
    "repositori.upload",
    "rapat.crud",
  ],
  BENDAHARA: [
    "keuangan.crud",
    "rab.crud",
    "dokumen.crudFinance",
    "repositori.upload",
  ],
  PJ_PDD: ["tugas.crud", "rab.crud", "media.crud"],
  ANGGOTA_PDD: [],
  PJ_KONSUMSI: ["konsumsi.manage"],
  PJ_ACARA: ["tugas.crud", "rab.crud", "program.crud", "pencapaian.crud"],
  ANGGOTA_ACARA: [],
  PJ_HUMLOG: ["tugas.crud", "rab.crud", "pemangku.crud"],
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

// Convenience: Super Admin OR Ketua. Replaces the common
// `role === "KETUA"` pattern that used to grant Ketua-level access.
export function isAdminOrKetua(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "KETUA";
}

// Convenience: Ketua-level manager set for approvals (Ketua, Super Admin, and
// anything else that opts into approval flows in the future).
export function canApprove(role: Role): boolean {
  return isAdminOrKetua(role);
}

// Explicit full list used for Super Admin fast-path. Keep in sync with the
// Permission union above.
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
  "pencapaian.crud",
  "pemangku.crud",
  "risiko.crud",
  "repositori.crud",
  "repositori.upload",
  "admin.users",
  "admin.roles",
  "admin.permissions",
  "admin.reports",
  "admin.config",
];
