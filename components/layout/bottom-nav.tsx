"use client";

import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import type { Role } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

type Item = { href: string; icon: LucideIcon; label: string };

const PRIMARY: Item[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tugas", icon: ListChecks, label: "Tugas" },
  { href: "/rapat", icon: CalendarDays, label: "Rapat" },
  { href: "/konsumsi", icon: Utensils, label: "Konsumsi" },
  { href: "/keuangan", icon: Wallet, label: "Keuangan" },
  { href: "/aktivitas", icon: ClipboardList, label: "Aktivitas" },
];

type Props = {
  user: { name: string; email: string; avatarUrl?: string | null; role: Role };
  unresolvedConflicts?: number;
};

/**
 * Mobile-only navigation. Five thumb-friendly primary destinations. Semua
 * modul lain diakses via burger di header, jadi tidak perlu tombol Menu di
 * sini. Sticky ke bawah viewport dengan safe-area padding untuk iOS
 * home-indicator.
 */
export function BottomNav(_props: Props) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Measure navbar height dan expose ke CSS variable `--bottom-nav-height`
  // supaya layout global bisa hitung padding-bottom yang benar tanpa magic
  // number. Pada desktop (md+) nav ini display:none via `md:hidden` →
  // getBoundingClientRect().height = 0 → variable jadi 0 → padding kembali
  // ke default desktop.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const doc = document.documentElement;

    const update = () => {
      const height = el.getBoundingClientRect().height;
      doc.style.setProperty("--bottom-nav-height", `${height}px`);
    };
    update();

    // ResizeObserver menangkap perubahan height (mis. font size, orientation).
    const ro = new ResizeObserver(update);
    ro.observe(el);

    // visualViewport bereaksi terhadap iOS Safari address-bar hide/show +
    // Android keyboard yang ubah viewport tanpa trigger resize element.
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    // Media query mengubah display:none ↔ block saat crossing md breakpoint.
    const mql = window.matchMedia("(min-width: 768px)");
    mql.addEventListener("change", update);

    return () => {
      ro.disconnect();
      vv?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      mql.removeEventListener("change", update);
      doc.style.removeProperty("--bottom-nav-height");
    };
  }, []);

  // Anchor via explicit left+right (no transform, no width calc). Width is
  // derived by the browser from the two anchors → no subpixel drift when
  // route changes, focus shifts, or the browser chrome (address bar,
  // scrollbar) redraws. Capped at 26rem via `max()` and floored at 0.5rem
  // side margin.
  const anchor = "max(0.5rem, calc(50% - 13rem))";

  return (
    <nav
      ref={navRef}
      aria-label="Navigasi utama"
      style={{
        left: anchor,
        right: anchor,
        bottom: "max(env(safe-area-inset-bottom), 0.5rem)",
      }}
      className={cn(
        "fixed z-40 rounded-2xl border bg-background/95 shadow-lg backdrop-blur md:hidden",
        // Isolate from parent reflow / repaint so route changes cannot
        // cascade a layout shift into this element.
        "[contain:layout_paint_style] will-change-transform",
      )}
    >
      <ul className="grid h-14 grid-cols-6 gap-1 px-1">
        {PRIMARY.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                className={cn(
                  "group/nav flex h-full flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium leading-none",
                  "transition-[background-color,color,transform] duration-300 ease-out",
                  "active:scale-[0.94]",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-transform duration-300 ease-out",
                    active && "scale-110",
                  )}
                />
                <span className="w-full truncate px-0.5 text-center">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
