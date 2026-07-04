"use client";

import { CalendarClock, Loader2, Plus, Search, Target, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  DivisiTag,
  ProgramCycle,
  ProgramStatus,
  Role,
} from "@/lib/generated/prisma/client";
import { cn, formatDate, getInitials } from "@/lib/utils";
import {
  DIVISI_LABELS,
  PROGRAM_CYCLE_LABELS,
  PROGRAM_STATUS_LABELS,
} from "@/lib/validators/program";

type Program = {
  id: string;
  cycle: ProgramCycle;
  divisi: DivisiTag;
  name: string;
  description: string | null;
  startDate: string | null;
  targetDate: string | null;
  progress: number;
  status: ProgramStatus;
  pic: { id: string; name: string; avatarUrl: string | null; role: Role };
  createdAt: string;
};

const DIVISI_LIST: DivisiTag[] = ["UMUM", "PDD", "ACARA", "HUMLOG", "KONSUMSI"];

const DIVISI_TONE: Record<DivisiTag, string> = {
  UMUM: "bg-slate-500/10 text-slate-700 border-slate-300 dark:text-slate-300",
  PDD: "bg-purple-500/10 text-purple-700 border-purple-300 dark:text-purple-300",
  ACARA: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300",
  HUMLOG: "bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-300",
  KONSUMSI: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300",
};

const CYCLES: ProgramCycle[] = ["SIKLUS_I", "SIKLUS_II", "SIKLUS_III", "SIKLUS_IV"];

const STATUS_STYLE: Record<ProgramStatus, string> = {
  RENCANA: "bg-slate-100 text-slate-700 ring-slate-200",
  BERLANGSUNG: "bg-blue-50 text-blue-700 ring-blue-200",
  SELESAI: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DIBATALKAN: "bg-rose-50 text-rose-700 ring-rose-200",
};

async function safeJson(res: Response): Promise<{ data?: unknown; error?: { message?: string } }> {
  const t = await res.text();
  if (!t) return {};
  try {
    return JSON.parse(t);
  } catch {
    return { error: { message: `Server error (${res.status})` } };
  }
}

export function ProgramClient({
  initial,
  members,
}: {
  initial: Program[];
  members: { id: string; name: string; role: Role }[];
}) {
  const router = useRouter();
  const [programs, setPrograms] = useState(initial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [cycle, setCycle] = useState<ProgramCycle>("SIKLUS_I");
  const [divisi, setDivisi] = useState<DivisiTag>("UMUM");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [picId, setPicId] = useState(members[0]?.id ?? "");

  // Filter + search
  const [search, setSearch] = useState("");
  const [filterDivisi, setFilterDivisi] = useState<DivisiTag | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<ProgramStatus | "ALL">("ALL");
  const [filterCycle, setFilterCycle] = useState<ProgramCycle | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return programs.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.description ?? "").toLowerCase().includes(q))
        return false;
      if (filterDivisi !== "ALL" && p.divisi !== filterDivisi) return false;
      if (filterStatus !== "ALL" && p.status !== filterStatus) return false;
      if (filterCycle !== "ALL" && p.cycle !== filterCycle) return false;
      return true;
    });
  }, [programs, search, filterDivisi, filterStatus, filterCycle]);

  const grouped = useMemo(() => {
    const map: Record<ProgramCycle, Program[]> = {
      SIKLUS_I: [],
      SIKLUS_II: [],
      SIKLUS_III: [],
      SIKLUS_IV: [],
    };
    for (const p of filtered) map[p.cycle].push(p);
    return map;
  }, [filtered]);

  const activeFilterCount =
    (filterDivisi !== "ALL" ? 1 : 0) +
    (filterStatus !== "ALL" ? 1 : 0) +
    (filterCycle !== "ALL" ? 1 : 0);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !picId) return;
    setSaving(true);
    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycle,
        divisi,
        name,
        description: description || null,
        startDate: startDate || null,
        targetDate: targetDate || null,
        picId,
      }),
    });
    const json = await safeJson(res);
    setSaving(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menyimpan");
      return;
    }
    setPrograms((prev) => [json.data as Program, ...prev]);
    setName("");
    setDescription("");
    setStartDate("");
    setTargetDate("");
    setDivisi("UMUM");
    setOpen(false);
    toast.success("Program tersimpan");
    router.refresh();
  }

  async function updateProgress(id: string, progress: number) {
    setPrograms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, progress } : p)),
    );
    const res = await fetch(`/api/programs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress }),
    });
    if (!res.ok) {
      toast.error("Gagal menyimpan progress");
      return;
    }
    toast.success(`Progress → ${progress}%`);
    router.refresh();
  }

  async function updateStatus(id: string, status: ProgramStatus) {
    setPendingId(id);
    const res = await fetch(`/api/programs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPendingId(null);
    if (!res.ok) {
      toast.error("Gagal update status");
      return;
    }
    setPrograms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p)),
    );
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!window.confirm("Hapus program ini?")) return;
    setPendingId(id);
    const res = await fetch(`/api/programs/${id}`, { method: "DELETE" });
    setPendingId(null);
    if (!res.ok) {
      toast.error("Gagal menghapus");
      return;
    }
    setPrograms((prev) => prev.filter((p) => p.id !== id));
    toast.success("Program dihapus");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: search + filter + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Cari program…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
            aria-label="Cari program"
          />
        </div>
        <Select
          value={filterDivisi}
          onValueChange={(v) => v && setFilterDivisi(v as DivisiTag | "ALL")}
        >
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue placeholder="Divisi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua divisi</SelectItem>
            {DIVISI_LIST.map((d) => (
              <SelectItem key={d} value={d}>
                {DIVISI_LABELS[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterStatus}
          onValueChange={(v) => v && setFilterStatus(v as ProgramStatus | "ALL")}
        >
          <SelectTrigger className="h-9 w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua status</SelectItem>
            <SelectItem value="RENCANA">Rencana</SelectItem>
            <SelectItem value="BERLANGSUNG">Berlangsung</SelectItem>
            <SelectItem value="SELESAI">Selesai</SelectItem>
            <SelectItem value="DIBATALKAN">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterCycle}
          onValueChange={(v) => v && setFilterCycle(v as ProgramCycle | "ALL")}
        >
          <SelectTrigger className="h-9 w-full sm:w-32">
            <SelectValue placeholder="Siklus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua siklus</SelectItem>
            {CYCLES.map((c) => (
              <SelectItem key={c} value={c}>
                {PROGRAM_CYCLE_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(activeFilterCount > 0 || search) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              setSearch("");
              setFilterDivisi("ALL");
              setFilterStatus("ALL");
              setFilterCycle("ALL");
            }}
          >
            Reset · {activeFilterCount + (search ? 1 : 0)}
          </Button>
        )}
        <div className="sm:ml-auto">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Program Baru
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground" aria-live="polite">
        Menampilkan {filtered.length} dari {programs.length} program
      </p>

      {programs.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Belum ada program"
          description="Rencanakan program kerja per siklus KKN Sisdamas — masing-masing dengan PIC dan target."
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Buat Program Pertama
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Tidak ada program yang cocok"
          description="Coba ubah filter atau kata kunci pencarian."
          compact
        />
      ) : (
        <div className="space-y-6">
          {CYCLES.map((c) => {
            const list = grouped[c];
            if (list.length === 0) return null;
            return (
              <section key={c}>
                <h2 className="mb-2 flex items-baseline justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {PROGRAM_CYCLE_LABELS[c]}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {list.length} program
                  </span>
                </h2>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((p) => (
                    <ProgramCard
                      key={p.id}
                      program={p}
                      pending={pendingId === p.id}
                      onProgress={updateProgress}
                      onStatus={updateStatus}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Program Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">
                  Nama Program <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="p-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Sosialisasi Kesehatan Lansia"
                  className="h-10"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Siklus</Label>
                <Select
                  value={cycle}
                  onValueChange={(v) => v && setCycle(v as ProgramCycle)}
                  disabled={saving}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CYCLES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {PROGRAM_CYCLE_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Divisi <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={divisi}
                  onValueChange={(v) => v && setDivisi(v as DivisiTag)}
                  disabled={saving}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIVISI_LIST.map((d) => (
                      <SelectItem key={d} value={d}>
                        {DIVISI_LABELS[d]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Divisi menentukan pengelompokan di halaman Timeline.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>
                  PIC <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={picId}
                  onValueChange={(v) => v && setPicId(v)}
                  disabled={saving}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Pilih PIC" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} · {ROLE_LABELS[m.role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-start">Tanggal Mulai</Label>
                <Input
                  id="p-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-target">Target Tanggal</Label>
                <Input
                  id="p-target"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="h-10"
                  disabled={saving}
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Tanggal Mulai + Target Tanggal dipakai halaman Timeline untuk
              menghitung progress berdasarkan waktu berjalan.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Deskripsi (opsional)</Label>
              <textarea
                id="p-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tujuan, sasaran, indikator keberhasilan…"
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={saving}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving || !name.trim() || !picId}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Program
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProgramCard({
  program,
  pending,
  onProgress,
  onStatus,
  onDelete,
}: {
  program: Program;
  pending: boolean;
  onProgress: (id: string, p: number) => void;
  onStatus: (id: string, s: ProgramStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [localProgress, setLocalProgress] = useState(program.progress);
  const isOverdue =
    program.targetDate &&
    new Date(program.targetDate) < new Date() &&
    program.status !== "SELESAI" &&
    program.status !== "DIBATALKAN";

  return (
    <Card className={cn(program.status === "DIBATALKAN" && "opacity-60")}>
      <CardContent className="space-y-3 p-4">
        <Badge
          variant="outline"
          className={cn("mb-1 text-[10px]", DIVISI_TONE[program.divisi])}
        >
          {DIVISI_LABELS[program.divisi].split(" ")[0]}
        </Badge>
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">
            {program.name}
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            onClick={() => onDelete(program.id)}
            aria-label="Hapus program"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            )}
          </Button>
        </div>

        {program.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {program.description}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 border">
            <AvatarImage src={program.pic.avatarUrl ?? undefined} />
            <AvatarFallback className="text-[9px]">
              {getInitials(program.pic.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-medium">{program.pic.name}</p>
            <p className="text-[10px] text-muted-foreground">
              PIC · {ROLE_LABELS[program.pic.role]}
            </p>
          </div>
        </div>

        {program.targetDate && (
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs",
              isOverdue ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <CalendarClock className="h-3 w-3" />
            Target: {formatDate(program.targetDate, { dateStyle: "medium" })}
            {isOverdue && " · lewat"}
          </p>
        )}

        {/* Progress input — slider + number + save button */}
        <div className="rounded-md border bg-muted/20 p-2.5">
          <div className="mb-1.5 flex items-baseline justify-between text-[11px]">
            <span className="font-medium text-foreground">Progress Laporan</span>
            <span className="tabular-nums font-semibold text-primary">
              {localProgress}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={localProgress}
            onChange={(e) => setLocalProgress(Number(e.target.value))}
            className="mb-2 h-2 w-full cursor-pointer accent-primary"
            aria-label="Progress program"
          />
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={localProgress}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) setLocalProgress(Math.max(0, Math.min(100, v)));
              }}
              className="h-7 w-16 rounded border border-input bg-background px-2 text-xs tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Progress angka"
            />
            <span className="text-[10px] text-muted-foreground">%</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-auto h-7 text-xs"
              onClick={() => onProgress(program.id, localProgress)}
              disabled={pending || localProgress === program.progress}
            >
              {localProgress === program.progress ? "Tersimpan" : "Simpan"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-2">
          <Badge
            variant="outline"
            className={cn("text-[10px] ring-1 ring-inset", STATUS_STYLE[program.status])}
          >
            {PROGRAM_STATUS_LABELS[program.status]}
          </Badge>
          <Select
            value={program.status}
            onValueChange={(v) => v && onStatus(program.id, v as ProgramStatus)}
            disabled={pending}
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RENCANA">Rencana</SelectItem>
              <SelectItem value="BERLANGSUNG">Berlangsung</SelectItem>
              <SelectItem value="SELESAI">Selesai</SelectItem>
              <SelectItem value="DIBATALKAN">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
