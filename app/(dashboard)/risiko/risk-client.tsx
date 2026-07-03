"use client";

import { AlertTriangle, Loader2, Plus, ShieldAlert, Trash2 } from "lucide-react";
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
import type {
  RiskCategory,
  RiskLevel,
  RiskStatus,
} from "@/lib/generated/prisma/client";
import { cn, formatDate } from "@/lib/utils";
import {
  RISK_CATEGORY_LABELS,
  RISK_LEVEL_LABELS,
  RISK_STATUS_LABELS,
} from "@/lib/validators/risk";

type Risk = {
  id: string;
  title: string;
  category: RiskCategory;
  probability: RiskLevel;
  impact: RiskLevel;
  mitigationPlan: string | null;
  status: RiskStatus;
  createdBy: { id: string; name: string };
  createdAt: string;
};

const LEVELS: RiskLevel[] = ["RENDAH", "SEDANG", "TINGGI"];
const CATEGORIES: RiskCategory[] = [
  "CUACA",
  "ANGGARAN",
  "KESEHATAN",
  "KONFLIK",
  "JADWAL",
  "LAINNYA",
];

// Priority score: probability × impact. Higher = more urgent.
const LEVEL_SCORE: Record<RiskLevel, number> = { RENDAH: 1, SEDANG: 2, TINGGI: 3 };

function scoreOf(r: { probability: RiskLevel; impact: RiskLevel }): number {
  return LEVEL_SCORE[r.probability] * LEVEL_SCORE[r.impact];
}

function priorityBucket(score: number): "low" | "med" | "high" {
  if (score >= 6) return "high";
  if (score >= 3) return "med";
  return "low";
}

const STATUS_STYLE: Record<RiskStatus, string> = {
  AKTIF: "bg-rose-50 text-rose-700 ring-rose-200",
  DIMITIGASI: "bg-amber-50 text-amber-700 ring-amber-200",
  TERJADI: "bg-slate-100 text-slate-700 ring-slate-200",
};

const PRIORITY_STYLE: Record<"low" | "med" | "high", string> = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  med: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-rose-50 text-rose-700 border-rose-200",
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

export function RiskClient({ initialRisks }: { initialRisks: Risk[] }) {
  const router = useRouter();
  const [risks, setRisks] = useState(initialRisks);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RiskCategory>("JADWAL");
  const [probability, setProbability] = useState<RiskLevel>("SEDANG");
  const [impact, setImpact] = useState<RiskLevel>("SEDANG");
  const [mitigationPlan, setMitigationPlan] = useState("");

  const stats = useMemo(() => {
    const active = risks.filter((r) => r.status === "AKTIF");
    const high = active.filter((r) => scoreOf(r) >= 6).length;
    const mit = risks.filter((r) => r.status === "DIMITIGASI").length;
    return { active: active.length, high, mit };
  }, [risks]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/risks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category,
        probability,
        impact,
        mitigationPlan: mitigationPlan || null,
      }),
    });
    const json = await safeJson(res);
    setSaving(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menyimpan");
      return;
    }
    setRisks((prev) => [json.data as Risk, ...prev]);
    setTitle("");
    setMitigationPlan("");
    setOpen(false);
    toast.success("Risiko terdaftar");
    router.refresh();
  }

  async function updateStatus(id: string, status: RiskStatus) {
    setPendingId(id);
    const res = await fetch(`/api/risks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPendingId(null);
    if (!res.ok) {
      toast.error("Gagal update status");
      return;
    }
    setRisks((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!window.confirm("Hapus risiko ini?")) return;
    setPendingId(id);
    const res = await fetch(`/api/risks/${id}`, { method: "DELETE" });
    setPendingId(null);
    if (!res.ok) {
      toast.error("Gagal menghapus");
      return;
    }
    setRisks((prev) => prev.filter((r) => r.id !== id));
    toast.success("Risiko dihapus");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="grid gap-2 sm:grid-cols-3">
        <StatChip
          icon={ShieldAlert}
          label="Risiko Aktif"
          value={stats.active}
          tone="rose"
        />
        <StatChip
          icon={AlertTriangle}
          label="Prioritas Tinggi"
          value={stats.high}
          tone="amber"
        />
        <StatChip
          icon={ShieldAlert}
          label="Sudah Dimitigasi"
          value={stats.mit}
          tone="emerald"
        />
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Daftar Risiko
        </Button>
      </div>

      {risks.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Belum ada risiko terdaftar"
          description="Identifikasi potensi masalah program (cuaca, anggaran, kesehatan, dll.) sebelum terjadi."
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Daftar Risiko Pertama
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {risks
            .slice()
            .sort((a, b) => scoreOf(b) - scoreOf(a))
            .map((r) => {
              const score = scoreOf(r);
              const bucket = priorityBucket(score);
              return (
                <Card
                  key={r.id}
                  className={cn("flex flex-col", r.status === "TERJADI" && "opacity-70")}
                >
                  <CardContent className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">
                            {RISK_CATEGORY_LABELS[r.category]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]", PRIORITY_STYLE[bucket])}
                          >
                            {bucket === "high"
                              ? "Prioritas Tinggi"
                              : bucket === "med"
                                ? "Prioritas Sedang"
                                : "Prioritas Rendah"}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold leading-tight">{r.title}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={pendingId === r.id}
                        onClick={() => onDelete(r.id)}
                        aria-label="Hapus risiko"
                      >
                        {pendingId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2 text-[11px]">
                      <div>
                        <p className="text-muted-foreground">Kemungkinan</p>
                        <p className="font-medium">{RISK_LEVEL_LABELS[r.probability]}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Dampak</p>
                        <p className="font-medium">{RISK_LEVEL_LABELS[r.impact]}</p>
                      </div>
                    </div>

                    {r.mitigationPlan && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Rencana Mitigasi
                        </p>
                        <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-xs">
                          {r.mitigationPlan}
                        </p>
                      </div>
                    )}

                    <div className="mt-auto space-y-2 border-t pt-3">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] ring-1 ring-inset", STATUS_STYLE[r.status])}
                        >
                          {RISK_STATUS_LABELS[r.status]}
                        </Badge>
                        <Select
                          value={r.status}
                          onValueChange={(v) => v && updateStatus(r.id, v as RiskStatus)}
                          disabled={pendingId === r.id}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AKTIF">Aktif</SelectItem>
                            <SelectItem value="DIMITIGASI">Dimitigasi</SelectItem>
                            <SelectItem value="TERJADI">Terjadi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="truncate">{r.createdBy.name}</span>
                        <span>{formatDate(r.createdAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Daftar Risiko Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="r-title">
                Judul Risiko <span className="text-destructive">*</span>
              </Label>
              <Input
                id="r-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Hujan lebat saat pembukaan"
                className="h-10"
                disabled={saving}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select
                  value={category}
                  onValueChange={(v) => v && setCategory(v as RiskCategory)}
                  disabled={saving}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {RISK_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kemungkinan</Label>
                <Select
                  value={probability}
                  onValueChange={(v) => v && setProbability(v as RiskLevel)}
                  disabled={saving}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {RISK_LEVEL_LABELS[l]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Dampak</Label>
                <Select
                  value={impact}
                  onValueChange={(v) => v && setImpact(v as RiskLevel)}
                  disabled={saving}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {RISK_LEVEL_LABELS[l]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-mit">Rencana Mitigasi</Label>
              <textarea
                id="r-mit"
                rows={4}
                value={mitigationPlan}
                onChange={(e) => setMitigationPlan(e.target.value)}
                placeholder="Langkah pencegahan atau rencana kontingensi…"
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
              <Button type="submit" disabled={saving || !title.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Daftarkan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CHIP_TONES = {
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
} as const;

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ShieldAlert;
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
