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
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@/lib/generated/prisma/client";
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

const DIVISI_ORDER = ["UMUM", "PDD", "ACARA", "HUMLOG", "KONSUMSI"];

function divisiOf(role: Role): string {
  if (role === "PJ_PDD" || role === "ANGGOTA_PDD") return "PDD";
  if (role === "PJ_ACARA" || role === "ANGGOTA_ACARA") return "ACARA";
  if (role === "PJ_HUMLOG" || role === "ANGGOTA_HUMLOG") return "HUMLOG";
  if (role === "PJ_KONSUMSI") return "KONSUMSI";
  return "UMUM";
}

type ProgramCard = {
  id: string;
  name: string;
  description: string | null;
  targetDate: Date | null;
  progress: number;
  status: string;
  picName: string;
};

export default async function TimelinePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const programs = await db.program.findMany({
    orderBy: [{ targetDate: "asc" }, { createdAt: "desc" }],
    include: {
      pic: { select: { id: true, name: true, role: true } },
    },
  });

  // Group by divisi
  const buckets: Record<string, ProgramCard[]> = {};
  for (const key of DIVISI_ORDER) buckets[key] = [];
  for (const p of programs) {
    const div = divisiOf(p.pic.role);
    buckets[div]?.push({
      id: p.id,
      name: p.name,
      description: p.description,
      targetDate: p.targetDate,
      progress: p.progress,
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
          {DIVISI_ORDER.map((key) => {
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
                      p.progress < 100;
                    return (
                      <Card
                        key={p.id}
                        className="transition-colors hover:border-primary/40"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm leading-snug">
                              {p.name}
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className={cn("shrink-0 text-[10px]", meta.tone)}
                            >
                              {p.status}
                            </Badge>
                          </div>
                          {p.description && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {p.description}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0 text-xs">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-muted-foreground">
                              <span>Progress</span>
                              <span className="tabular-nums font-medium text-foreground">
                                {p.progress}%
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full transition-all",
                                  p.progress >= 100
                                    ? "bg-emerald-500"
                                    : p.progress >= 60
                                      ? "bg-blue-500"
                                      : p.progress >= 30
                                        ? "bg-amber-500"
                                        : "bg-rose-500",
                                )}
                                style={{ width: `${Math.min(p.progress, 100)}%` }}
                                aria-hidden
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Users2 className="h-3 w-3" /> {p.picName}
                            </span>
                            {p.targetDate && (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1",
                                  isOverdue && "text-destructive",
                                )}
                              >
                                <CalendarClock className="h-3 w-3" />
                                {formatDate(p.targetDate, {
                                  dateStyle: "medium",
                                })}
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
          Divisi ditentukan dari role PIC. Kelola program di{" "}
          <Link
            href="/program"
            className="font-medium text-primary underline underline-offset-2"
          >
            /program
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
