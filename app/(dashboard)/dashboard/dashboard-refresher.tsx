"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Client component that refreshes the dashboard's server data every 30
 * seconds (soft polling). Pauses when the tab is hidden and resumes on
 * visibility change to avoid burning quota on background tabs.
 *
 * Renders nothing visible.
 */
export function DashboardRefresher({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const onVisibility = () => setEnabled(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, router]);

  return null;
}
