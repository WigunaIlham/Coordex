import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarClock,
  Megaphone,
  PartyPopper,
  Route as RouteIcon,
  Truck,
  Utensils,
  Users2,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DivisiTag } from "@/lib/generated/prisma/client";
import { cn, formatDate } from "@/lib/utils";

const DIVISI_META: Record<
  string,
  { label: string; icon: typeof Megaphone; tone: string }
> = {
  PDD: {
    label: "PDD (Publikasi Dokumentasi)",
    icon: Megaphone,
    tone: "bg-purple-500/10 text-purple-700 border-purple-300 dark:text-purple-300",
  },
  ACARA: {
    label: "Acara",
    icon: PartyPopper,
    tone: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300",
  },
  HUMLOG: {
    label: "HumLog",
    icon: Truck,
    tone: "bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-300",
  },
  KONSUMSI: {
    label: "Konsumsi",
    icon: Utensils,
    tone: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300",
  },
  UMUM: {
    label: "Umum (Ketua/Sekretaris/Bendahara)",
    icon: Users2,
    tone: "bg-slate-500/10 text-slate-700 border-slate-300 dark:text-slate-300",
  },
};

const DIVISI_ORDER: DivisiTag[] = ["UMUM", "PDD", "ACARA", "HUMLOG", "KONSUMSI"];

type ProgramCard = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  targetDate: Date | null;
  progressManual: number;
  status: string;
  picName: string;
};

/**
 * Time-based auto progress = seberapa jauh kita di antara startDate dan
 * targetDate. Kalau salah satu belum diisi, fallback ke null (UI akan
 * menampilkan progress manual saja). Clamped 0–100.
 */
function computeAutoProgress(
  startDate: Date | null,
  targetDate: Date | null,
): number | null {
  if (!startDate || !targetDate) return null;
  const total = targetDate.getTime() - startDate.getTime();
  if (total <= 0) return null;
  const elapsed = Date.now() - startDate.getTime();
  const ratio = elapsed / total;
  if (ratio <= 0) return 0;
  if (ratio >= 1) return 100;
  return Math.round(ratio * 100);
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ divisi?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { divisi: divisiParam } = await searchParams;
  const activeDivisi =
    divisiParam && (DIVISI_ORDER as string[]).includes(divisiParam.toUpperCase())
      ? (divisiParam.toUpperCase() as DivisiTag)
      : ("SEMUA" as "SEMUA");

  const programs = await db.program.findMany({
    orderBy: [{ targetDate: "asc" }, { createdAt: "desc" }],
    include: {
      pic: { select: { id: true, name: true, role: true } },
    },
  });

  // Group by divisi eksplisit dari kolom program.divisi
  const buckets: Record<string, ProgramCard[]> = {};
  for (const key of DIVISI_ORDER) buckets[key] = [];
  for (const p of programs) {
    buckets[p.divisi]?.push({
      id: p.id,
      name: p.name,
      description: p.description,
      startDate: p.startDate,
      targetDate: p.targetDate,
      progressManual: p.progress,
      status: p.status,
      picName: p.pic.name,
    });
  }

  const totalPrograms = programs.length;

  return (
    <div>
      <PageHeader
        title="Timeline Divisi"
        description="Peta jalan program per divisi — target, progress, dan PIC."
      />

      {/* Filter divisi */}
      <div
        role="tablist"
        aria-label="Filter divisi"
        className="mb-6 flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/40 p-1"
      >
        {(["SEMUA", ...DIVISI_ORDER] as const).map((key) => {
          const isActive = key === activeDivisi;
          const meta = key === "SEMUA"
            ? { label: "Semua", icon: Users, tone: "", count: totalPrograms }
            : {
                label: DIVISI_META[key].label.split(" ")[0],
                icon: DIVISI_META[key].icon,
                tone: DIVISI_META[key].tone,
                count: buckets[key]?.length ?? 0,
              };
          const Icon = meta.icon;
          return (
            <Link
              key={key}
              role="tab"
              aria-selected={isActive}
              href={key === "SEMUA" ? "/timeline" : `/timeline?divisi=${key}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0 text-[9px] tabular-nums",
                  isActive ? "bg-muted" : "bg-muted-foreground/10",
                )}
              >
                {meta.count}
              </span>
            </Link>
          );
        })}
      </div>

      {totalPrograms === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center">
          <RouteIcon
            className="mx-auto mb-3 h-10 w-10 text-muted-foreground"
            aria-hidden
          />
          <p className="text-lg font-semibold">Belum ada program</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Timeline muncul otomatis setelah tim menambahkan program.{" "}
            <Link
              href="/program"
              className="font-medium text-primary underline underline-offset-2"
            >
              Buat program baru
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {DIVISI_ORDER.filter(
            (k) => activeDivisi === "SEMUA" || k === activeDivisi,
          ).map((key) => {
            const items = buckets[key] ?? [];
            if (items.length === 0) return null;
            const meta = DIVISI_META[key];
            const Icon = meta.icon;
            return (
              <section key={key} aria-labelledby={`div-${key}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h2
                    id={`div-${key}`}
                    className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    <Icon className="h-4 w-4" /> {meta.label}
                  </h2>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {items.length} program
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p) => {
                    const isOverdue =
                      p.targetDate &&
                      new Date(p.targetDate) < new Date() &&
                      p.progressManual < 100;
                    const autoProgress = computeAutoProgress(
                      p.startDate,
                      p.targetDate,
                    );
                    // Timeline visual pakai auto-progress kalau ada; kalau tidak
                    // ada rentang tanggal, jatuh balik ke progress manual.
                    const shown = autoProgress ?? p.progressManual;
                    const behindSchedule =
                      autoProgress !== null &&
                      p.progressManual + 5 < autoProgress &&
                      p.progressManual < 100;
                    return (
                      <Card
                        key={p.id}
                        className="transition-colors hover:border-primary/40"
                      >
                        <CardHeader className="pb-3">
                          <div className="mb-1.5 flex flex-wrap items-center gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] gap-1",
                                meta.tone,
                              )}
                            >
                              <Icon className="h-3 w-3" />
                              {meta.label.split(" ")[0]}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              {p.status}
                            </Badge>
                          </div>
                          <CardTitle className="text-sm leading-snug">
                            {p.name}
                          </CardTitle>
                          {p.description && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {p.description}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0 text-xs">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-muted-foreground">
                              <span>
                                {autoProgress !== null
                                  ? "Waktu berjalan"
                                  : "Progress"}
                              </span>
                              <span className="tabular-nums font-medium text-foreground">
                                {shown}%
                              </span>
                            </div>
                            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full transition-all",
                                  shown >= 100
                                    ? "bg-emerald-500"
                                    : shown >= 60
                                      ? "bg-blue-500"
                                      : shown >= 30
                                        ? "bg-amber-500"
                                        : "bg-rose-500",
                                )}
                                style={{
                                  width: `${Math.min(shown, 100)}%`,
                                }}
                                aria-hidden
                              />
                              {/* Overlay: manual progress marker kalau berbeda */}
                              {autoProgress !== null && (
                                <span
                                  className="absolute top-0 h-full w-0.5 bg-foreground/50"
                                  style={{
                                    left: `${Math.min(p.progressManual, 100)}%`,
                                  }}
                                  aria-label={`Progress laporan tim: ${p.progressManual}%`}
                                />
                              )}
                            </div>
                            {autoProgress !== null && (
                              <p
                                className={cn(
                                  "mt-1 text-[10px]",
                                  behindSchedule
                                    ? "text-destructive"
                                    : "text-muted-foreground",
                                )}
                              >
                                Laporan tim: {p.progressManual}%
                                {behindSchedule && " · Tertinggal"}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Users2 className="h-3 w-3" /> {p.picName}
                            </span>
                            {(p.startDate || p.targetDate) && (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1",
                                  isOverdue && "text-destructive",
                                )}
                              >
                                <CalendarClock className="h-3 w-3" />
                                {p.startDate && p.targetDate
                                  ? `${formatDate(p.startDate, { dateStyle: "medium" })} → ${formatDate(p.targetDate, { dateStyle: "medium" })}`
                                  : formatDate(
                                      (p.targetDate ?? p.startDate)!,
                                      { dateStyle: "medium" },
                                    )}
                                {isOverdue && " (lewat)"}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Legenda progress</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-full bg-rose-500" /> 0–29%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-full bg-amber-500" /> 30–59%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-full bg-blue-500" /> 60–99%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-full bg-emerald-500" /> 100%
          </span>
        </div>
        <p className="mt-2">
          Divisi ditentukan dari role PIC. Bar warna = <b>waktu berjalan</b>{" "}
          otomatis dari rentang tanggal (mulai → target). Garis tipis di
          atasnya = <b>laporan tim</b> (input manual di halaman{" "}
          <Link
            href="/program"
            className="font-medium text-primary underline underline-offset-2"
          >
            Program
          </Link>
          ). Kalau garis di kiri bar warna berarti tim tertinggal dari
          jadwal.
        </p>
      </div>
    </div>
  );
}
