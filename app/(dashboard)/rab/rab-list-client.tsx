"use client";

import {
  Calculator,
  CheckCircle2,
  Edit3,
  FileText,
  Layers,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
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
import type { DivisiTag, RabStatus } from "@/lib/generated/prisma/client";
import { formatRupiah } from "@/lib/services/rab.service";
import { cn, formatDateTime } from "@/lib/utils";
import {
  RAB_DIVISI_LABELS,
  RAB_STATUS_LABELS,
} from "@/lib/validators/rab";

type Row = {
  id: string;
  title: string;
  description: string | null;
  divisi: DivisiTag;
  status: RabStatus;
  createdAt: string;
  createdBy: { id: string; name: string };
  categoryCount: number;
  itemCount: number;
  grandTotal: number;
};

const DIVISI_LIST: DivisiTag[] = ["UMUM", "PDD", "ACARA", "HUMLOG", "KONSUMSI"];
const STATUS_LIST: RabStatus[] = ["DRAFT", "REVISI", "FIX"];

const DIVISI_TONE: Record<DivisiTag, string> = {
  UMUM: "bg-slate-500/10 text-slate-700 border-slate-300 dark:text-slate-300",
  PDD: "bg-purple-500/10 text-purple-700 border-purple-300 dark:text-purple-300",
  ACARA: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300",
  HUMLOG: "bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-300",
  KONSUMSI: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300",
};

const STATUS_TONE: Record<RabStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/15 dark:text-slate-200 dark:border-slate-500/40",
  REVISI:
    "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/40",
  FIX: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/40",
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

export function RabListClient({
  initial,
  canCreate,
  currentUserId,
}: {
  initial: Row[];
  canCreate: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [prevInitial, setPrevInitial] = useState(initial);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [divisi, setDivisi] = useState<DivisiTag>("UMUM");
  const [status, setStatus] = useState<RabStatus>("DRAFT");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterDivisi, setFilterDivisi] = useState<DivisiTag | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<RabStatus | "ALL">("ALL");

  // Sync when server refetches (React 19 pattern)
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setRows(initial);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.title.toLowerCase().includes(q) && !(r.description ?? "").toLowerCase().includes(q))
        return false;
      if (filterDivisi !== "ALL" && r.divisi !== filterDivisi) return false;
      if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
      return true;
    });
  }, [rows, search, filterDivisi, filterStatus]);

  const activeFilterCount =
    (filterDivisi !== "ALL" ? 1 : 0) + (filterStatus !== "ALL" ? 1 : 0);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/rab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        divisi,
        status,
      }),
    });
    const json = await safeJson(res);
    setSaving(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal membuat RAB");
      return;
    }
    const created = json.data as { id: string };
    toast.success("RAB dibuat");
    setCreateOpen(false);
    setTitle("");
    setDescription("");
    setDivisi("UMUM");
    setStatus("DRAFT");
    router.push(`/rab/${created.id}`);
  }

  async function onDelete(id: string) {
    if (!window.confirm("Hapus RAB ini beserta seluruh kategori & itemnya?")) return;
    setDeleting(id);
    const res = await fetch(`/api/rab/${id}`, { method: "DELETE" });
    const json = await safeJson(res);
    setDeleting(null);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menghapus");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("RAB dihapus");
    router.refresh();
  }

  async function onStatusChange(id: string, newStatus: RabStatus) {
    setPendingStatus(id);
    const res = await fetch(`/api/rab/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setPendingStatus(null);
    if (!res.ok) {
      const j = await safeJson(res);
      toast.error(j.error?.message ?? "Gagal ubah status");
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)),
    );
    toast.success(`Status → ${RAB_STATUS_LABELS[newStatus]}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Cari RAB…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
            aria-label="Cari RAB"
          />
        </div>
        <Select
          value={filterDivisi}
          onValueChange={(v) => v && setFilterDivisi(v as DivisiTag | "ALL")}
        >
          <SelectTrigger className="h-9 w-full sm:w-36">
            <SelectValue placeholder="Divisi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua divisi</SelectItem>
            {DIVISI_LIST.map((d) => (
              <SelectItem key={d} value={d}>
                {RAB_DIVISI_LABELS[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterStatus}
          onValueChange={(v) => v && setFilterStatus(v as RabStatus | "ALL")}
        >
          <SelectTrigger className="h-9 w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua status</SelectItem>
            {STATUS_LIST.map((s) => (
              <SelectItem key={s} value={s}>
                {RAB_STATUS_LABELS[s]}
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
            }}
          >
            Reset · {activeFilterCount + (search ? 1 : 0)}
          </Button>
        )}
        {canCreate && (
          <div className="sm:ml-auto">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> RAB Baru
            </Button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground" aria-live="polite">
        Menampilkan {filtered.length} dari {rows.length} RAB
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={Calculator}
          title="Belum ada RAB"
          description={
            canCreate
              ? "Susun rencana anggaran per kegiatan sekarang — subtotal & grand total dihitung otomatis."
              : "Belum ada dokumen RAB yang bisa dibuka."
          }
          action={
            canCreate && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Buat RAB Pertama
              </Button>
            )
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Tidak ada RAB yang cocok"
          description="Coba ubah filter atau kata kunci pencarian."
          compact
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const canEditRow =
              canCreate && (r.createdBy.id === currentUserId || canCreate);
            const StatusIcon =
              r.status === "FIX"
                ? CheckCircle2
                : r.status === "REVISI"
                  ? Edit3
                  : FileText;
            return (
              <Card
                key={r.id}
                className={cn(
                  "group relative flex flex-col overflow-hidden transition-colors hover:border-primary/40",
                  r.status === "FIX" && "ring-1 ring-emerald-300 dark:ring-emerald-500/40",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-0 top-0 h-1",
                    r.status === "FIX"
                      ? "bg-emerald-500"
                      : r.status === "REVISI"
                        ? "bg-amber-500"
                        : "bg-slate-400",
                  )}
                />
                <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", DIVISI_TONE[r.divisi])}
                        >
                          {RAB_DIVISI_LABELS[r.divisi]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 text-[10px] font-semibold",
                            STATUS_TONE[r.status],
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {RAB_STATUS_LABELS[r.status]}
                        </Badge>
                      </div>
                      <Link
                        href={`/rab/${r.id}`}
                        className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary hover:underline"
                      >
                        {r.title}
                      </Link>
                      {r.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {r.description}
                        </p>
                      )}
                    </div>
                    {canEditRow && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={deleting === r.id}
                        onClick={() => onDelete(r.id)}
                        aria-label="Hapus RAB"
                      >
                        {deleting === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                      <Layers className="h-3 w-3" /> {r.categoryCount} kategori
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                      <FileText className="h-3 w-3" /> {r.itemCount} item
                    </span>
                  </div>

                  <div className="mt-auto space-y-2 border-t pt-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Grand Total
                      </p>
                      <p className="text-lg font-bold tabular-nums">
                        {formatRupiah(r.grandTotal)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="truncate">{r.createdBy.name}</span>
                      <span>{formatDateTime(r.createdAt)}</span>
                    </div>
                    {canEditRow && (
                      <Select
                        value={r.status}
                        onValueChange={(v) =>
                          v && onStatusChange(r.id, v as RabStatus)
                        }
                        disabled={pendingStatus === r.id}
                      >
                        <SelectTrigger className="h-7 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_LIST.map((s) => (
                            <SelectItem key={s} value={s}>
                              Ubah ke {RAB_STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>RAB Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="rab-title">
                Judul <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rab-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="RAB Pembukaan KKN"
                disabled={saving}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Divisi</Label>
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
                        {RAB_DIVISI_LABELS[d]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status Awal</Label>
                <Select
                  value={status}
                  onValueChange={(v) => v && setStatus(v as RabStatus)}
                  disabled={saving}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s}>
                        {RAB_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rab-desc">Deskripsi (opsional)</Label>
              <textarea
                id="rab-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving || !title.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Buat
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
