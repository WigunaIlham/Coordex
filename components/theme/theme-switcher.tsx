"use client";

import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { COLOR_SCHEMES, useColorScheme, type ColorScheme } from "./theme-provider";

const MODES = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Ikuti Sistem", icon: Monitor },
] as const;

// Fixed swatch color per scheme so the dot in the menu matches the actual
// primary. Kept in sync with the CSS variables in globals.css.
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

export function ThemeSwitcher({ align = "end" }: { align?: "start" | "end" }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { color, setColor } = useColorScheme();
  const [mounted, setMounted] = useState(false);

  // next-themes only knows the real value after hydration. Until then, render
  // a neutral icon so we don't ship a hydration-mismatch warning.
  useEffect(() => setMounted(true), []);
  const activeIcon = mounted
    ? resolvedTheme === "dark"
      ? Moon
      : Sun
    : Sun;
  const ActiveIcon = activeIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ubah tema"
          >
            <ActiveIcon className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align={align} className="w-56">
        {/* Base UI (base-nova) requires GroupLabel to sit inside <Group>. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mode Tampilan
          </DropdownMenuLabel>
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mounted && theme === m.value;
            return (
              <DropdownMenuItem
                key={m.value}
                onClick={() => setTheme(m.value)}
                className={cn("cursor-pointer", active && "bg-muted")}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span className="flex-1">{m.label}</span>
                {active && <Check className="ml-2 h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Palette className="h-3 w-3" /> Warna Aksen
          </DropdownMenuLabel>
          {COLOR_SCHEMES.map((c) => {
            const active = color === c;
            return (
              <DropdownMenuItem
                key={c}
                onClick={() => setColor(c)}
                className={cn("cursor-pointer", active && "bg-muted")}
              >
                <span
                  className="mr-2 grid h-4 w-4 shrink-0 place-items-center rounded-full border shadow-sm"
                  style={{ backgroundColor: SWATCH[c] }}
                  aria-hidden
                />
                <span className="flex-1">{COLOR_LABELS[c]}</span>
                {active && <Check className="ml-2 h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
