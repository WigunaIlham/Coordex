"use client";

import {
  Award,
  ExternalLink,
  Loader2,
  Plus,
  Target as TargetIcon,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import type { AchievementType } from "@/lib/generated/prisma/client";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { ACHIEVEMENT_TYPE_LABELS } from "@/lib/validators/achievement";

type Achievement = {
  id: string;
  type: AchievementType;
  title: string;
  url: string | null;
  publishedDate: string | null;
  author: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
};

type Target = {
  type: AchievementType;
  targetCount: number;
  description: string | null;
};

const TYPES: AchievementType[] = ["ARTIKEL", "VIDEO", "BERITA", "LAINNYA"];

const TYPE_TONE: Record<AchievementType, string> = {
  ARTIKEL: "bg-blue-50 text-blue-700 ring-blue-200",
  VIDEO: "bg-purple-50 text-purple-700 ring-purple-200",
  BERITA: "bg-amber-50 text-amber-700 ring-amber-200",
  LAINNYA: "bg-slate-100 text-slate-700 ring-slate-200",
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

export function AchievementClient({
  initialAchievements,
  initialTargets,
}: {
  initialAchievements: Achievement[];
  initialTargets: Target[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialAchievements);
  const [targets, setTargets] = useState(initialTargets);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [type, setType] = useState<AchievementType>("ARTIKEL");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [publishedDate, setPublishedDate] = useState("");

  // Target edit dialog
  const [targetOpen, setTargetOpen] = useState(false);
  const [editingType, setEditingType] = useState<AchievementType>("ARTIKEL");
  const [editingCount, setEditingCount] = useState(0);
  const [tSaving, setTSaving] = useState(false);

  const counts = useMemo(() => {
    const map: Record<AchievementType, number> = {
      ARTIKEL: 0,
      VIDEO: 0,
      BERITA: 0,
      LAINNYA: 0,
    };
    for (const it of items) map[it.type]++;
    return map;
  }, [items]);

  const progress = useMemo(() => {
    return TYPES.map((t) => {
      const tgt = targets.find((x) => x.type === t)?.targetCount ?? 0;
      const actual = counts[t];
      const pct = tgt === 0 ? 0 : Math.min(100, Math.round((actual / tgt) * 100));
      return { type: t, target: tgt, actual, pct };
    });
  }, [targets, counts]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title,
        url: url || undefined,
        publishedDate: publishedDate || null,
      }),
    });
    const json = await safeJson(res);
    setSaving(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menyimpan");
      return;
    }
    setItems((prev) => [json.data as Achievement, ...prev]);
    setTitle("");
    setUrl("");
    setPublishedDate("");
    setOpen(false);
    toast.success("Pencapaian tersimpan");
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!window.confirm("Hapus pencapaian ini?")) return;
    setPendingId(id);
    const res = await fetch(`/api/achievements/${id}`, { method: "DELETE" });
    setPendingId(null);
    if (!res.ok) {
      toast.error("Gagal menghapus");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.success("Terhapus");
    router.refresh();
  }

  function startEditTarget(t: AchievementType) {
    setEditingType(t);
    setEditingCount(targets.find((x) => x.type === t)?.targetCount ?? 0);
    setTargetOpen(true);
  }

  async function submitTarget(e: React.FormEvent) {
    e.preventDefault();
    setTSaving(true);
    const res = await fetch("/api/achievements/targets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: editingType, targetCount: editingCount }),
    });
    const json = await safeJson(res);
    setTSaving(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal update target");
      return;
    }
    setTargets((prev) => {
      const other = prev.filter((x) => x.type !== editingType);
      return [...other, json.data as Target].sort((a, b) => a.type.localeCompare(b.type));
    });
    setTargetOpen(false);
    toast.success(`Target ${editingType} → ${editingCount}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Progress grid: target vs actual */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {progress.map((p) => {
          const bucket = p.pct >= 100 ? "done" : p.pct >= 60 ? "on" : "off";
          const barTone =
            bucket === "done"
              ? "bg-emerald-500"
              : bucket === "on"
                ? "bg-blue-500"
                : "bg-rose-400";
          return (
            <button
              key={p.type}
              type="button"
              onClick={() => startEditTarget(p.type)}
              className="rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`Ubah target ${ACHIEVEMENT_TYPE_LABELS[p.type]}`}
            >
              <div className="flex items-start justify-between">
                <Badge
                  variant="outline"
                  className={cn("text-[10px] ring-1 ring-inset", TYPE_TONE[p.type])}
                >
                  {ACHIEVEMENT_TYPE_LABELS[p.type]}
                </Badge>
                <TargetIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums">
                {p.actual}
                <span className="text-sm font-normal text-muted-foreground">
                  /{p.target}
                </span>
              </p>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                aria-hidden
              >
                <div
                  className={cn("h-full transition-all", barTone)}
                  style={{ width: `${p.pct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {p.target === 0
                  ? "Target belum di-set · klik untuk ubah"
                  : `${p.pct}% dari target · klik untuk ubah`}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Catat Pencapaian
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Belum ada pencapaian"
          description="Setiap artikel, video, atau berita yang dipublikasikan tim bisa dicatat di sini. Update target di atas kalau perlu."
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Catat Pertama
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-xl border bg-card p-3"
            >
              <Avatar className="h-8 w-8 border">
                <AvatarImage src={a.author.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(a.author.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] ring-1 ring-inset", TYPE_TONE[a.type])}
                  >
                    {ACHIEVEMENT_TYPE_LABELS[a.type]}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {a.publishedDate
                      ? formatDate(a.publishedDate, { dateStyle: "medium" })
                      : formatDate(a.createdAt, { dateStyle: "medium" })}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium">{a.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  oleh {a.author.name}
                </p>
                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Buka <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pendingId === a.id}
                onClick={() => onDelete(a.id)}
                aria-label="Hapus"
              >
                {pendingId === a.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Pencapaian</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <div className="space-y-1.5">
                <Label>Jenis</Label>
                <Select
                  value={type}
                  onValueChange={(v) => v && setType(v as AchievementType)}
                  disabled={saving}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ACHIEVEMENT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-date">Tanggal terbit</Label>
                <Input
                  id="a-date"
                  type="date"
                  value={publishedDate}
                  onChange={(e) => setPublishedDate(e.target.value)}
                  className="h-10"
                  disabled={saving}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-title">
                Judul <span className="text-destructive">*</span>
              </Label>
              <Input
                id="a-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Liputan Peresmian TPS Sampah"
                className="h-10"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-url">URL (opsional)</Label>
              <Input
                id="a-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="h-10"
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
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Target edit dialog */}
      <Dialog open={targetOpen} onOpenChange={setTargetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Target {ACHIEVEMENT_TYPE_LABELS[editingType]}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitTarget} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-count">Jumlah target</Label>
              <Input
                id="t-count"
                type="number"
                min={0}
                inputMode="numeric"
                value={editingCount}
                onChange={(e) => setEditingCount(Number(e.target.value))}
                className="h-10"
                disabled={tSaving}
              />
              <p className="text-[11px] text-muted-foreground">
                Set 0 untuk menonaktifkan target jenis ini.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTargetOpen(false)}
                disabled={tSaving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={tSaving}>
                {tSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Target
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
