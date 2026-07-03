import {
  AlertTriangle,
  Award,
  BookOpen,
  Building2,
  Calculator,
  CalendarDays,
  ClipboardList,
  FileText,
  Frown,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Settings,
  ShieldAlert,
  Target,
  Users,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/lib/generated/prisma/client";
import { hasAnyPermission, type Permission } from "@/lib/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissions?: Permission[]; // undefined = visible for all authenticated users
  badge?: "ketua-conflicts";
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Utama",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permissions: ["dashboard.view"] },
      { label: "Tugas", href: "/tugas", icon: ListChecks, permissions: ["tugas.view"] },
      { label: "Aktivitas", href: "/aktivitas", icon: ClipboardList, permissions: ["aktivitas.crud"] },
      { label: "Beban Kerja", href: "/beban-kerja", icon: Gauge, permissions: ["beban_kerja.crud"] },
    ],
  },
  {
    label: "Tim & Wellbeing",
    items: [
      { label: "Survei Stres", href: "/stres", icon: Frown, permissions: ["stres.respond"] },
      { label: "Laporkan Masalah", href: "/konflik/baru", icon: AlertTriangle, permissions: ["konflik.report"] },
      {
        label: "Pusat Konflik",
        href: "/konflik",
        icon: ShieldAlert,
        permissions: ["konflik.manage"],
        badge: "ketua-conflicts",
      },
    ],
  },
  {
    label: "Operasional",
    items: [
      { label: "Keuangan", href: "/keuangan", icon: Wallet, permissions: ["keuangan.view"] },
      { label: "RAB", href: "/rab", icon: Calculator, permissions: ["rab.view"] },
      { label: "Dokumen", href: "/dokumen", icon: FileText, permissions: ["dokumen.view"] },
      { label: "Rapat", href: "/rapat", icon: CalendarDays, permissions: ["rapat.view"] },
      { label: "Jadwal Konsumsi", href: "/konsumsi", icon: Utensils, permissions: ["konsumsi.view"] },
    ],
  },
  {
    label: "Modul Tambahan",
    items: [
      { label: "Repositori", href: "/repositori", icon: BookOpen, permissions: ["repositori.view"] },
      { label: "Media", href: "/media", icon: Megaphone, permissions: ["media.crud"] },
      { label: "Program", href: "/program", icon: Target, permissions: ["program.crud"] },
      { label: "Pencapaian", href: "/pencapaian", icon: Award, permissions: ["pencapaian.crud"] },
      { label: "Pemangku Kepentingan", href: "/pemangku", icon: Building2, permissions: ["pemangku.crud"] },
      { label: "Risiko", href: "/risiko", icon: AlertTriangle, permissions: ["risiko.crud"] },
    ],
  },
  {
    label: "Akun",
    items: [
      { label: "Profil", href: "/profil", icon: Users, permissions: ["profil.view"] },
      { label: "Admin", href: "/admin/pengguna", icon: Settings, permissions: ["admin.users"] },
    ],
  },
];

// Filter a group's items by the current user's role.
export function itemsVisibleTo(role: Role, items: NavItem[]): NavItem[] {
  return items.filter((item) => !item.permissions || hasAnyPermission(role, item.permissions));
}
