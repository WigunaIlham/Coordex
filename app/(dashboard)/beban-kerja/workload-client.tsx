"use client";

import { AlertTriangle, ChevronDown, ChevronUp, Gauge, ListChecks } from "lucide-react";
import { useMemo, useState } from "react";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { PRIORITY_META } from "@/components/tasks/task-meta";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Switch } from "@/components/ui/switch";
import { WORKLOAD_CAPACITY } from "@/lib/constants";
import type { Role, TaskPriority, TaskStatus } from "@/lib/generated/prisma/client";
import { workloadStatusLabel } from "@/lib/services/workload.service";
import { cn, formatDate, getInitials } from "@/lib/utils";
import type { WorkloadStatus } from "@/types";

type Row = {
  userId: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  weightedPoints: number;
  utilizationPercent: number;
  status: WorkloadStatus;
  activeTasks: {
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    points: number;
    dueDate: string | null;
  }[];
};

const STATUS_BAR_COLOR: Record<WorkloadStatus, string> = {
  UNDERUTILIZED: "bg-blue-400",
  NORMAL: "bg-emerald-500",
  OVERLOADED: "bg-red-500",
};

const STATUS_BADGE_VARIANT: Record<WorkloadStatus, string> = {
  UNDERUTILIZED: "bg-blue-50 text-blue-700 border-blue-200",
  NORMAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OVERLOADED: "bg-red-50 text-red-700 border-red-200",
};

export function WorkloadClient({
  initialData,
  canSeeAll,
}: {
  initialData: Row[];
  canSeeAll: boolean;
}) {
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const visible = useMemo(() => {
    if (!onlyProblems) return initialData;
    return initialData.filter((r) => r.status !== "NORMAL");
  }, [initialData, onlyProblems]);

  // Summary strip
  const overloaded = initialData.filter((r) => r.status === "OVERLOADED").length;
  const under = initialData.filter((r) => r.status === "UNDERUTILIZED").length;
  const normal = initialData.filter((r) => r.status === "NORMAL").length;

  return (
    <div className="space-y-4">
      {canSeeAll && (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            <SummaryChip
              icon={AlertTriangle}
              label="Overload"
              value={overloaded}
              tone="rose"
            />
            <SummaryChip
              icon={Gauge}
              label="Normal"
              value={normal}
              tone="emerald"
            />
            <SummaryChip
              icon={ListChecks}
              label="Ringan"
              value={under}
              tone="blue"
            />
          </div>

          <label
            htmlFor="only-problem"
            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-card p-3"
          >
            <div>
              <span className="text-sm font-medium">
                Tampilkan yang perlu perhatian saja
              </span>
              <p className="text-xs text-muted-foreground">
                Sembunyikan anggota dengan beban Normal.
              </p>
            </div>
            <Switch
              checked={onlyProblems}
              onCheckedChange={setOnlyProblems}
              id="only-problem"
            />
          </label>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((r) => {
          const isOpen = expanded[r.userId];
          const barWidth = Math.min(r.utilizationPercent, 150);
          return (
            <Card key={r.userId}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={r.avatarUrl ?? undefined} />
                    <AvatarFallback>{getInitials(r.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[r.role]}</p>
                  </div>
                  <Badge variant="outline" className={STATUS_BADGE_VARIANT[r.status]}>
                    {workloadStatusLabel(r.status)}
                  </Badge>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{r.utilizationPercent}%</span>
                    <span className="text-muted-foreground">
                      {r.weightedPoints} / {WORKLOAD_CAPACITY} poin
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full transition-all", STATUS_BAR_COLOR[r.status])}
                      style={{ width: `${(barWidth / 150) * 100}%` }}
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [r.userId]: !prev[r.userId] }))
                  }
                  disabled={r.activeTasks.length === 0}
                >
                  <span className="text-xs">
                    {r.activeTasks.length} tugas aktif
                  </span>
                  {r.activeTasks.length > 0 &&
                    (isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                </Button>

                {isOpen && r.activeTasks.length > 0 && (
                  <ul className="space-y-1.5 text-sm">
                    {r.activeTasks.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1.5"
                      >
                        <span className="line-clamp-1 flex-1">{t.title}</span>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", PRIORITY_META[t.priority].badgeClass)}
                        >
                          {PRIORITY_META[t.priority].label}
                        </Badge>
                        {t.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(t.dueDate, { dateStyle: "medium" })}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
        {visible.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={Gauge}
              title={
                onlyProblems ? "Semua anggota dalam kondisi normal" : "Belum ada data"
              }
              description={
                onlyProblems
                  ? "Tidak ada anggota yang overload atau under-utilised saat ini."
                  : "Data beban kerja akan muncul setelah anggota mendapat tugas."
              }
              compact
            />
          </div>
        )}
      </div>
    </div>
  );
}

const CHIP_TONES = {
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
} as const;

function SummaryChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Gauge;
  label: string;
  value: number;
  tone: keyof typeof CHIP_TONES;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-inset",
        CHIP_TONES[tone],
      )}
    >
      <Icon className="h-4 w-4" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">
          {label}
        </p>
        <p className="text-lg font-semibold leading-tight tabular-nums">{value}</p>
      </div>
    </div>
  );
}
