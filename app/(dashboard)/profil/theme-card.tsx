"use client";

import { Monitor, Moon, Palette, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import {
  COLOR_SCHEMES,
  useColorScheme,
  type ColorScheme,
} from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

const MODES: { value: string; label: string; icon: LucideIcon; hint: string }[] = [
  { value: "light", label: "Terang", icon: Sun, hint: "Latar cerah, cocok siang" },
  { value: "dark", label: "Gelap", icon: Moon, hint: "Nyaman untuk malam" },
  {
    value: "system",
    label: "Ikuti Sistem",
    icon: Monitor,
    hint: "Auto sinkron dengan OS",
  },
];

const SWATCH: Record<ColorScheme, string> = {
  default: "oklch(0.6 0.14 155)",
  blue: "oklch(0.55 0.18 240)",
  rose: "oklch(0.6 0.22 15)",
  amber: "oklch(0.68 0.17 70)",
  violet: "oklch(0.55 0.2 295)",
};

const COLOR_LABELS: Record<ColorScheme, string> = {
  default: "Emerald",
  blue: "Biru",
  rose: "Rose",
  amber: "Amber",
  violet: "Violet",
};

export function ThemeCard() {
  const { theme, setTheme } = useTheme();
  const { color, setColor } = useColorScheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Mode Tampilan
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => {
            const active = mounted && theme === m.value;
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setTheme(m.value)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-inset ring-primary/20"
                    : "border-input hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <div
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-lg",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-[11px] text-muted-foreground">{m.hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Palette className="h-3 w-3" /> Warna Aksen
        </p>
        <div
          role="radiogroup"
          aria-label="Warna aksen"
          className="grid grid-cols-5 gap-2"
        >
          {COLOR_SCHEMES.map((c) => {
            const active = color === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setColor(c)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-inset ring-primary/20"
                    : "border-input hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <span
                  className="grid h-8 w-8 place-items-center rounded-full border shadow-sm"
                  style={{ backgroundColor: SWATCH[c] }}
                  aria-hidden
                />
                <span className="text-[11px] font-medium">{COLOR_LABELS[c]}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Warna aksen diterapkan ke tombol, link, dan chart. Preferensi disimpan
          di perangkat ini.
        </p>
      </div>
    </div>
  );
}
