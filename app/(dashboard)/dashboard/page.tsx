import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  Flame,
  MessageSquare,
  Utensils,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { BAND_COLOR } from "@/components/stress/stress-band";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardRefresher } from "./dashboard-refresher";
import {
  getFinanceAggregate,
  getMeetingCount,
  getRecentActivities,
  getTodayConsumptionDuty,
  getTodayPiketDuty,
  getUnresolvedConflictCount,
  getUpcomingMeetings,
} from "@/lib/services/dashboard.service";
import {
  computeTeamStressIndex,
  getStressBand,
} from "@/lib/services/stress.service";
import { cn, formatCurrency, formatDateTime, getInitials } from "@/lib/utils";
import { isAdminOrKetua } from "@/lib/permissions";
import type { LucideIcon } from "lucide-react";

type Kpi = {
  label: string;
  value: string;
  valueColor?: string;
  icon: LucideIcon;
  accent: "emerald" | "blue" | "amber" | "rose";
  href?: string;
  hint: string;
};

const ACCENT_MAP: Record<Kpi["accent"], { ring: string; icon: string }> = {
  emerald: { ring: "before:bg-emerald-500", icon: "bg-emerald-50 text-emerald-700" },
  blue: { ring: "before:bg-blue-500", icon: "bg-blue-50 text-blue-700" },
  amber: { ring: "before:bg-amber-500", icon: "bg-amber-50 text-amber-700" },
  rose: { ring: "before:bg-rose-500", icon: "bg-rose-50 text-rose-700" },
};

function KpiCard({ kpi }: { kpi: Kpi }) {
  const accent = ACCENT_MAP[kpi.accent];
  const Icon = kpi.icon;
  const inner = (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-4 transition-colors",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-1",
        accent.ring,
        kpi.href && "hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
        <span className={cn("grid h-7 w-7 place-items-center rounded-md", accent.icon)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p
        className="mt-2 text-2xl font-semibold tracking-tight"
        style={kpi.valueColor ? { color: kpi.valueColor } : undefined}
      >
        {kpi.value}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{kpi.hint}</p>
    </div>
  );
  return kpi.href ? (
    <Link
      href={kpi.href}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const isKetua = isAdminOrKetua(session.user.role);

  // Today's date-only key. Baked into the consumption-duty cache key so the
  // entry auto-rotates at midnight without needing manual invalidation.
  const todayKey = new Date().toISOString().slice(0, 10);

  // "Active survey" is user-specific (my responses / all responses branch), so
  // kept uncached.
  const activeSurveyPromise = db.stressSurvey.findFirst({
    where: { isActive: true },
    orderBy: { weekNumber: "desc" },
    include: {
      responses: isKetua
        ? true
        : { where: { userId }, select: { id: true } },
    },
  });

  const [
    myActive,
    teamActive,
    recentActivities,
    conflictCount,
    financeAggr,
    activeSurvey,
    upcomingMeetings,
    totalMeetings,
    todayDuty,
    todayPiket,
  ] = await Promise.all([
    // Per-user active tasks (mine).
    db.task.count({
      where: {
        assignees: { some: { userId } },
        status: { in: ["TODO", "IN_PROGRESS", "REVIEW"] },
      },
    }),
    // Team-wide active tasks (untuk konteks "berapa banyak PR tim lagi").
    db.task.count({
      where: {
        status: { in: ["TODO", "IN_PROGRESS", "REVIEW"] },
      },
    }),
    // Cached 10s — team-wide.
    getRecentActivities(),
    isKetua ? getUnresolvedConflictCount() : Promise.resolve<number | null>(null),
    // Saldo dibuka untuk semua user — cuma informasi ringkasan finance
    // team-wide, bukan detail transaksi. Cache 10s + polling 30s = <40s
    // stale worst-case.
    getFinanceAggregate(),
    activeSurveyPromise,
    getUpcomingMeetings(),
    getMeetingCount(),
    getTodayConsumptionDuty(todayKey),
    getTodayPiketDuty(todayKey),
  ]);

  const responses = activeSurvey?.responses ?? [];
  const myResponded = responses.some((r) => {
    const uid = (r as { userId?: string }).userId;
    // When we loaded scoped to the current user, every returned row belongs to
    // them. When we loaded the whole set (Ketua), match by userId.
    return uid === undefined || uid === userId;
  });
  const teamStressIndex =
    isKetua && activeSurvey
      ? computeTeamStressIndex(
          activeSurvey.responses as Parameters<typeof computeTeamStressIndex>[0],
        )
      : null;
  const teamStressBand = teamStressIndex !== null ? getStressBand(teamStressIndex) : null;
  const surveyPending = activeSurvey && !myResponded
    ? { id: activeSurvey.id, weekNumber: activeSurvey.weekNumber }
    : null;

  let balance: number | null = null;
  if (Array.isArray(financeAggr)) {
    const inSum = Number(financeAggr.find((g) => g.type === "PEMASUKAN")?._sum.amount ?? 0);
    const outSum = Number(financeAggr.find((g) => g.type === "PENGELUARAN")?._sum.amount ?? 0);
    balance = inSum - outSum;
  }

  const firstName = (session.user.name ?? "Tim").split(" ")[0];

  const nextMeeting = upcomingMeetings[0];
  const hasFutureMeeting = nextMeeting && !nextMeeting.isPast;
  const nextMeetingHint = nextMeeting
    ? hasFutureMeeting
      ? `Terdekat: ${formatDateTime(nextMeeting.scheduledAt)}`
      : `Terakhir: ${formatDateTime(nextMeeting.scheduledAt)}`
    : "Belum ada rapat";

  const kpis: Kpi[] = [
    {
      label: "Tugas Aktif",
      value: String(teamActive),
      icon: ClipboardList,
      accent: "emerald",
      href: "/tugas",
      hint:
        teamActive > 0
          ? `Total tim · ${myActive} milik Anda`
          : "Belum ada tugas aktif",
    },
    {
      label: "Rapat",
      value: String(totalMeetings),
      icon: CalendarDays,
      accent: "blue",
      href: "/rapat",
      hint: nextMeetingHint,
    },
    {
      label: "Saldo KKN",
      value: balance !== null ? formatCurrency(balance) : "Rp 0",
      icon: Wallet,
      accent: "amber",
      href: "/keuangan",
      hint: "Real-time · Auto-refresh 30s",
    },
    {
      label: "Indeks Stres Tim",
      value: teamStressIndex !== null ? String(teamStressIndex) : "—",
      valueColor: teamStressBand ? BAND_COLOR[teamStressBand] : undefined,
      icon: Flame,
      accent: "rose",
      href: "/stres",
      hint:
        teamStressIndex !== null
          ? `${isKetua ? activeSurvey?.responses.length ?? 0 : 0} response · Minggu ke-${
              activeSurvey?.weekNumber ?? "—"
            }`
          : isKetua
            ? "Belum ada survei"
            : "Khusus Ketua",
    },
  ];

  return (
    <div>
      <DashboardRefresher />
      <PageHeader
        title={`Halo, ${firstName} 👋`}
        description="Ringkasan aktivitas tim hari ini."
      />

      {/* Priority stack: survey CTA first (personal), then Ketua-level warnings. */}
      {(surveyPending || (isKetua && (conflictCount ?? 0) > 0)) && (
        <div className="mb-6 space-y-3">
          {surveyPending && (
            <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-blue-500/40 dark:bg-blue-500/10">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Survei minggu ke-{surveyPending.weekNumber} menunggu
                  </p>
                  <p className="text-blue-800/80 dark:text-blue-200/80">
                    Luangkan 1 menit untuk mengisi survei wellbeing tim.
                  </p>
                </div>
              </div>
              <Link
                href="/stres"
                className={cn(buttonVariants({ size: "sm" }), "self-start sm:self-auto")}
              >
                Isi Sekarang
              </Link>
            </div>
          )}
          {isKetua && conflictCount !== null && conflictCount > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-500/40 dark:bg-amber-500/10">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-amber-900 dark:text-amber-100">Perhatian Ketua</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-amber-900/80 dark:text-amber-200/80">
                  <span>{conflictCount} laporan konflik belum terselesaikan.</span>
                  <Link href="/konflik" className="font-medium underline underline-offset-2">
                    Buka
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
              <Link
                href="/aktivitas"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Lihat semua <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Belum ada aktivitas"
                description="Update tim akan muncul di sini setelah anggota mem-posting kegiatan."
                compact
              />
            ) : (
              recentActivities.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 border">
                    <AvatarImage src={a.author.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(a.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{a.author.name}</span>
                      <span>{ROLE_LABELS[a.author.role]}</span>
                      <span>· {formatDateTime(a.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{a.title}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{a.content}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {a.category}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {hasFutureMeeting ? "Rapat Mendatang" : "Rapat Terakhir"}
                </CardTitle>
                <Link
                  href="/rapat"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Lihat semua <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingMeetings.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Belum ada rapat"
                  description="Buat rapat pertama dari halaman Rapat."
                  compact
                />
              ) : (
                upcomingMeetings.map((m) => (
                  <Link
                    key={m.id}
                    href={`/rapat/${m.id}`}
                    className="group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
                  >
                    <div
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-md",
                        m.isPast
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium group-hover:text-primary">
                        {m.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {formatDateTime(m.scheduledAt)}
                        {m.location ? ` · ${m.location}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {m._count.attendees} peserta{" "}
                        {m.isPast && (
                          <Badge
                            variant="outline"
                            className="ml-1 h-4 border-muted-foreground/30 px-1 text-[9px] font-normal text-muted-foreground"
                          >
                            selesai
                          </Badge>
                        )}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Konsumsi Hari Ini</CardTitle>
            </CardHeader>
            <CardContent>
              {!todayDuty || todayDuty.members.length === 0 ? (
                <EmptyState
                  icon={Utensils}
                  title="Belum ada jadwal"
                  description="Jadwal konsumsi hari ini belum dibuat."
                  compact
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {todayDuty.members.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center gap-2 rounded-full border bg-muted/30 px-2 py-1 text-xs"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m.user.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[8px]">
                          {getInitials(m.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      {m.user.name}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Piket Hari Ini</CardTitle>
            </CardHeader>
            <CardContent>
              {!todayPiket || todayPiket.members.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Belum ada jadwal"
                  description="Jadwal piket hari ini belum dibuat."
                  compact
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {todayPiket.members.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center gap-2 rounded-full border bg-muted/30 px-2 py-1 text-xs"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m.user.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[8px]">
                          {getInitials(m.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      {m.user.name}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
