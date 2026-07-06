"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { SidebarFooter } from "@/components/layout/sidebar-footer";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

type Props = {
  user: { name: string; email: string; avatarUrl?: string | null; role: Role };
  unresolvedConflicts?: number;
  children: React.ReactNode;
};

const STORAGE_KEY = "kkn-os:sidebar:collapsed";

/**
 * Application shell.
 *
 * - Mobile: hidden desktop sidebar. Bottom nav gives 5 primary destinations
 *   plus a "Menu" trigger for the full drawer.
 * - Tablet+: persistent sidebar with a collapse toggle (icon-only mode) so
 *   power users can maximise horizontal space. Preference is stored in
 *   localStorage.
 * - Content area has bottom padding on mobile so nothing hides behind the
 *   bottom nav.
 */
export function AppShell({ user, unresolvedConflicts, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      // localStorage may be blocked (private mode, etc.). Default = expanded.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r bg-card md:flex",
          // Sticky ke top viewport + tinggi = 100vh supaya isi utama bisa
          // scroll tapi sidebar tetap terpaku di posisinya.
          "md:sticky md:top-0 md:h-screen",
          "transition-[width] duration-200 ease-out",
          collapsed ? "w-16" : "w-60",
        )}
        aria-label="Sidebar navigasi"
      >
        <div
          className={cn(
            "flex h-14 items-center border-b",
            collapsed ? "justify-center px-0" : "gap-2 px-4",
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2 font-semibold",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
            )}
            aria-label="Coordex"
          >
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
              C
            </span>
            {!collapsed && (
              <span className="leading-tight">
                <span className="block">Coordex</span>
                <span className="block text-[10px] font-normal text-muted-foreground">
                  Sisdamas 2026
                </span>
              </span>
            )}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav
            role={user.role}
            unresolvedConflicts={unresolvedConflicts}
            collapsed={collapsed}
          />
        </div>
        <div className="border-t px-2 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("w-full", collapsed ? "px-0" : "justify-start")}
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Perluas sidebar" : "Ringkas sidebar"}
            aria-pressed={collapsed}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2 text-xs">Ringkas</span>
              </>
            )}
          </Button>
        </div>
        {!collapsed && <SidebarFooter user={user} />}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} unresolvedConflicts={unresolvedConflicts} />
        <main
          id="main-content"
          tabIndex={-1}
          // Bottom padding dihitung dinamis dari height nav pill (measured
          // via ResizeObserver di BottomNav) + safe-area untuk iOS home
          // indicator + gap kecil. Pada desktop, var = 0px sehingga md:pb-6
          // yang berlaku.
          className={cn(
            "flex-1 p-4 focus:outline-none",
            "pb-[calc(var(--bottom-nav-height,0px)+env(safe-area-inset-bottom)+1rem)]",
            "md:p-6 md:pb-6 lg:p-8",
          )}
        >
          {children}
        </main>
      </div>

      <BottomNav user={user} unresolvedConflicts={unresolvedConflicts} />
    </div>
  );
}
