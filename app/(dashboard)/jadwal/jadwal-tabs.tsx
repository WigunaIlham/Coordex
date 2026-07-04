import Link from "next/link";
import { CalendarDays, ClipboardCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type Tab = "konsumsi" | "piket";

export function JadwalTabs({ active }: { active: Tab }) {
  const tabs: { key: Tab; label: string; icon: typeof CalendarDays }[] = [
    { key: "konsumsi", label: "Konsumsi", icon: CalendarDays },
    { key: "piket", label: "Piket", icon: ClipboardCheck },
  ];
  return (
    <div
      role="tablist"
      aria-label="Kategori jadwal"
      className="mb-4 inline-flex rounded-lg border bg-muted/40 p-1"
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            role="tab"
            aria-selected={isActive}
            href={t.key === "konsumsi" ? "/jadwal" : `/jadwal?tab=${t.key}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
