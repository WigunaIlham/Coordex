import { Plus, ShieldCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ConflictStatusBadge } from "@/components/conflict/conflict-badges";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cn, formatDateTime } from "@/lib/utils";
import { CONFLICT_CATEGORY_LABELS } from "@/lib/validators/conflict";
import { isAdminOrKetua } from "@/lib/permissions";
import type { ConflictStatus } from "@/lib/generated/prisma/client";

const STATUS_FILTERS = ["OPEN", "DISKUSI", "SELESAI"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function isValidStatus(v: unknown): v is StatusFilter {
  return typeof v === "string" && (STATUS_FILTERS as readonly string[]).includes(v);
}

export default async function KonflikPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isKetua = isAdminOrKetua(session.user.role);

  const { status } = await searchParams;
  const activeFilter: StatusFilter | null = isValidStatus(status) ? status : null;

  // Two queries: (1) totals for every status (stat cards never change with filter)
  // and (2) the actual filtered list to render.
  const baseWhere = isKetua ? {} : { reporterId: session.user.id };
  const [allReports, reports] = await Promise.all([
    db.conflictReport.findMany({
      where: baseWhere,
      select: { status: true },
    }),
    db.conflictReport.findMany({
      where: activeFilter ? { ...baseWhere, status: activeFilter } : baseWhere,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        reporter: { select: { id: true, name: true, role: true } },
      },
    }),
  ]);

  const counts = {
    OPEN: allReports.filter((r) => r.status === "OPEN").length,
    DISKUSI: allReports.filter((r) => r.status === "DISKUSI").length,
    SELESAI: allReports.filter((r) => r.status === "SELESAI").length,
  };

  return (
    <div>
      <PageHeader
        title={isKetua ? "Pusat Konflik" : "Laporan Saya"}
        description={
          isKetua
            ? "Tinjau dan tangani laporan dari anggota tim."
            : "Daftar laporan yang Anda kirim."
        }
        action={
          <Link
            href="/konflik/baru"
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="mr-2 h-4 w-4" /> Laporkan Masalah
          </Link>
        }
      />

      {allReports.length > 0 && (
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <StatFilterCard
            tone="destructive"
            label="Terbuka"
            count={counts.OPEN}
            status="OPEN"
            active={activeFilter === "OPEN"}
          />
          <StatFilterCard
            tone="amber"
            label="Sedang diskusi"
            count={counts.DISKUSI}
            status="DISKUSI"
            active={activeFilter === "DISKUSI"}
          />
          <StatFilterCard
            tone="emerald"
            label="Selesai"
            count={counts.SELESAI}
            status="SELESAI"
            active={activeFilter === "SELESAI"}
          />
        </div>
      )}

      {activeFilter && (
        <div className="mb-3 flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs">
          <span>
            Menampilkan <span className="font-medium">{reports.length}</span> laporan
            berstatus{" "}
            <span className="font-medium">
              {activeFilter === "OPEN"
                ? "Terbuka"
                : activeFilter === "DISKUSI"
                  ? "Sedang diskusi"
                  : "Selesai"}
            </span>
          </span>
          <Link href="/konflik" className="text-primary hover:underline">
            Reset filter
          </Link>
        </div>
      )}

      {reports.length === 0 ? (
        <EmptyState
          icon={isKetua ? ShieldCheck : ShieldAlert}
          title={
            activeFilter
              ? "Tidak ada laporan cocok"
              : isKetua
                ? "Tim dalam kondisi baik"
                : "Anda belum mengirim laporan"
          }
          description={
            activeFilter
              ? "Coba pilih kategori lain di atas atau reset filter."
              : isKetua
                ? "Belum ada laporan konflik. Semua notifikasi laporan akan muncul di sini."
                : "Kalau ada masalah interpersonal atau operasional, laporkan agar Ketua bisa membantu."
          }
          action={
            !activeFilter &&
            !isKetua && (
              <Link
                href="/konflik/baru"
                className={buttonVariants({ size: "sm" })}
              >
                <Plus className="mr-2 h-4 w-4" /> Laporan pertama
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            const hideReporter = r.isAnonymous && isKetua;
            return (
              <Link key={r.id} href={`/konflik/${r.id}`} className="block">
                <Card className="transition-colors hover:border-primary/40 hover:bg-muted/30">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {CONFLICT_CATEGORY_LABELS[r.category]}
                        </Badge>
                        <ConflictStatusBadge status={r.status} />
                        {r.isAnonymous && (
                          <Badge variant="outline" className="text-[10px]">
                            Anonim
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(r.createdAt)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm">{r.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Pelapor:{" "}
                      <span className="font-medium text-foreground">
                        {hideReporter
                          ? "Anonim"
                          : r.reporter
                            ? r.reporter.name
                            : "—"}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Stat "card" that doubles as a filter chip. Click cycles the filter — if it's
 * already active, clicking again removes the filter.
 */
function StatFilterCard({
  tone,
  label,
  count,
  status,
  active,
}: {
  tone: "destructive" | "amber" | "emerald";
  label: string;
  count: number;
  status: ConflictStatus;
  active: boolean;
}) {
  const styles = {
    destructive:
      "bg-destructive/10 text-destructive ring-destructive/20 hover:ring-destructive/40",
    amber: "bg-amber-50 text-amber-700 ring-amber-200 hover:ring-amber-300",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:ring-emerald-300",
  }[tone];

  return (
    <Link
      href={active ? "/konflik" : `/konflik?status=${status}`}
      aria-pressed={active}
      className={cn(
        "group flex items-center justify-between rounded-lg px-3 py-2 ring-1 ring-inset transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        styles,
        active && "shadow-sm ring-2",
      )}
    >
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
          {label}
        </span>
        <span className="text-[10px] opacity-70 group-hover:opacity-100">
          {active ? "Klik lagi untuk reset" : "Klik untuk filter"}
        </span>
      </div>
      <span className="text-2xl font-bold tabular-nums">{count}</span>
    </Link>
  );
}
