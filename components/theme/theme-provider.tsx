"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const COLOR_SCHEMES = ["default", "blue", "rose", "amber", "violet"] as const;
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

const COLOR_STORAGE_KEY = "kkn-os:color";
const DEFAULT_COLOR: ColorScheme = "default";

type ColorContextValue = {
  color: ColorScheme;
  setColor: (color: ColorScheme) => void;
};

const ColorContext = createContext<ColorContextValue | null>(null);

/**
 * Wraps next-themes for light/dark AND a small color-scheme context for accent
 * palettes. The color choice is applied as `data-color` on <html> and persisted
 * to localStorage — no server round-trip needed.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [color, setColorState] = useState<ColorScheme>(DEFAULT_COLOR);

  // Hydrate from localStorage on first client render. Runs *after* the
  // pre-hydration script has already applied the class/attribute, so users
  // don't see a flash of the default theme.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLOR_STORAGE_KEY);
      if (stored && (COLOR_SCHEMES as readonly string[]).includes(stored)) {
        setColorState(stored as ColorScheme);
      }
    } catch {
      // localStorage may be blocked — accept the default silently.
    }
  }, []);

  // Reflect state → DOM + persist.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (color === "default") {
      document.documentElement.removeAttribute("data-color");
    } else {
      document.documentElement.setAttribute("data-color", color);
    }
    try {
      window.localStorage.setItem(COLOR_STORAGE_KEY, color);
    } catch {
      /* ignore */
    }
  }, [color]);

  const setColor = useCallback((next: ColorScheme) => {
    setColorState(next);
  }, []);

  const value = useMemo(() => ({ color, setColor }), [color, setColor]);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="kkn-os:theme"
    >
      <ColorContext.Provider value={value}>{children}</ColorContext.Provider>
    </NextThemesProvider>
  );
}

export function useColorScheme(): ColorContextValue {
  const ctx = useContext(ColorContext);
  if (!ctx) {
    // In practice we always wrap the app. Fallback keeps hooks-in-tests safe.
    return { color: DEFAULT_COLOR, setColor: () => undefined };
  }
  return ctx;
}
