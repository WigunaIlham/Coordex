"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { itemsVisibleTo, navGroups } from "@/components/layout/nav-items";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

type Props = {
  role: Role;
  unresolvedConflicts?: number;
  onNavigate?: () => void;
  /** Icon-only mode when the desktop sidebar is collapsed. */
  collapsed?: boolean;
};

export function SidebarNav({
  role,
  unresolvedConflicts,
  onNavigate,
  collapsed = false,
}: Props) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Menu utama"
      className={cn("flex flex-col gap-5 py-4", collapsed ? "px-1.5" : "px-2")}
    >
      {navGroups.map((group) => {
        const visibleItems = itemsVisibleTo(role, group.items);
        if (visibleItems.length === 0) return null;

        return (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
            )}
            {collapsed && (
              <div
                aria-hidden
                className="mx-2 mb-1 border-t border-dashed border-border"
              />
            )}
            {visibleItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              const badgeCount =
                item.badge === "ketua-conflicts" ? unresolvedConflicts : undefined;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center rounded-md text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    collapsed
                      ? "justify-center px-0 py-2"
                      : "gap-3 px-2.5 py-2",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-primary",
                        collapsed && "left-0 h-4",
                      )}
                    />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {badgeCount !== undefined && badgeCount > 0 && (
                    <Badge
                      variant="destructive"
                      className={cn(
                        "h-5 px-1.5 text-[10px]",
                        collapsed && "absolute right-1 top-1 h-4 min-w-4 px-1",
                      )}
                    >
                      {badgeCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
