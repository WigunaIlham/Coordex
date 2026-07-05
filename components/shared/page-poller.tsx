"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Soft-polling client component: memicu router.refresh() secara berkala
 * sehingga data server component fresh tanpa user perlu reload.
 *
 * Pause otomatis kalau tab hidden (visibilitychange) supaya tidak buang
 * quota Vercel di tab background.
 *
 * Render kosong — dipasang di dalam server component page manapun yang
 * butuh polling ringan. Default 30 detik (aman untuk realtime perceived).
 */
export function PagePoller({
  intervalMs = 30_000,
}: {
  intervalMs?: number;
}) {
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
