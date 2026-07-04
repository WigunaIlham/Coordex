import {
  AlertTriangle,
  BookOpen,
  Building2,
  Calculator,
  CalendarDays,
  ClipboardList,
  FileText,
  Frown,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  MessagesSquare,
  Route as RouteIcon,
  Settings,
  ShieldAlert,
  Target,
  Users,
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
      { label: "Timeline", href: "/timeline", icon: RouteIcon, permissions: ["dashboard.view"] },
    ],
  },
  {
    label: "Operasional",
    items: [
      { label: "Keuangan", href: "/keuangan", icon: Wallet, permissions: ["keuangan.view"] },
      { label: "RAB", href: "/rab", icon: Calculator, permissions: ["rab.view"] },
      { label: "Dokumen", href: "/dokumen", icon: FileText, permissions: ["dokumen.view"] },
      { label: "Rapat", href: "/rapat", icon: CalendarDays, permissions: ["rapat.view"] },
      { label: "Jadwal", href: "/jadwal", icon: CalendarDays, permissions: ["konsumsi.view"] },
    ],
  },
  {
    label: "Modul Tambahan",
    items: [
      { label: "Repositori", href: "/repositori", icon: BookOpen, permissions: ["repositori.view"] },
      { label: "Media", href: "/media", icon: Megaphone, permissions: ["media.crud"] },
      { label: "Program", href: "/program", icon: Target, permissions: ["program.crud"] },
      { label: "Pemangku Kepentingan", href: "/pemangku", icon: Building2, permissions: ["pemangku.crud"] },
      { label: "QnA", href: "/qna", icon: MessagesSquare, permissions: ["qna.crud"] },
      { label: "Tutorial", href: "/tutorial", icon: GraduationCap, permissions: ["dashboard.view"] },
    ],
  },
  {
    label: "Akun",
    items: [
      { label: "Profil", href: "/profil", icon: Users, permissions: ["profil.view"] },
      { label: "Admin", href: "/admin/pengguna", icon: Settings, permissions: ["admin.users"] },
    ],
  },
  {
    // Isu tim & konflik — dipindah ke paling bawah karena jarang diakses harian
    // dan biar tidak jadi noise di sidebar untuk operasi rutin.
    label: "Isu Tim",
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
];

// Filter a group's items by the current user's role.
export function itemsVisibleTo(role: Role, items: NavItem[]): NavItem[] {
  return items.filter((item) => !item.permissions || hasAnyPermission(role, item.permissions));
}
