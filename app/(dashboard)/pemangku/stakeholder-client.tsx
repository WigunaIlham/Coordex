"use client";

import {
  Building2,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
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
  DialogDescription,
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
import type { StakeholderCategory } from "@/lib/generated/prisma/client";
import { cn, formatDate } from "@/lib/utils";
import { STAKEHOLDER_CATEGORY_LABELS } from "@/lib/validators/stakeholder";

type Stakeholder = {
  id: string;
  name: string;
  category: StakeholderCategory;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdBy: { id: string; name: string };
  interactionCount: number;
  createdAt: string;
};

type HistoryItem = {
  id: string;
  summary: string;
  date: string;
  recordedBy: { id: string; name: string };
  createdAt: string;
};

const CATEGORIES: StakeholderCategory[] = [
  "RT",
  "RW",
  "PKK",
  "KARANG_TARUNA",
  "MASJID",
  "PERANGKAT_DESA",
  "POKJA",
  "LAINNYA",
];

async function safeJson(res: Response): Promise<{ data?: unknown; error?: { message?: string } }> {
  const t = await res.text();
  if (!t) return {};
  try {
    return JSON.parse(t);
  } catch {
    return { error: { message: `Server error (${res.status})` } };
  }
}

export function StakeholderClient({ initial }: { initial: Stakeholder[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<StakeholderCategory | "ALL">("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Detail dialog
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = useMemo(() => rows.find((r) => r.id === detailId) ?? null, [rows, detailId]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Add history form
  const [addHistoryOpen, setAddHistoryOpen] = useState(false);
  const [hSummary, setHSummary] = useState("");
  const [hDate, setHDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hSaving, setHSaving] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [category, setCategory] = useState<StakeholderCategory>("RT");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (catFilter !== "ALL" && r.category !== catFilter) return false;
      if (
        query &&
        !r.name.toLowerCase().includes(query) &&
        !(r.phone ?? "").toLowerCase().includes(query)
      )
        return false;
      return true;
    });
  }, [rows, q, catFilter]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/stakeholders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        phone: phone || null,
        address: address || null,
        notes: notes || null,
      }),
    });
    const json = await safeJson(res);
    setSaving(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menyimpan");
      return;
    }
    setRows((prev) => [json.data as Stakeholder, ...prev]);
    setName("");
    setPhone("");
    setAddress("");
    setNotes("");
    setCreateOpen(false);
    toast.success("Kontak tersimpan");
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!window.confirm("Hapus kontak beserta riwayatnya?")) return;
    setPendingId(id);
    const res = await fetch(`/api/stakeholders/${id}`, { method: "DELETE" });
    setPendingId(null);
    if (!res.ok) {
      toast.error("Gagal menghapus");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setHistoryOpen(false);
    toast.success("Kontak dihapus");
    router.refresh();
  }

  async function openDetail(id: string) {
    setDetailId(id);
    setHistoryOpen(true);
    setLoadingHistory(true);
    const res = await fetch(`/api/stakeholders/${id}`);
    setLoadingHistory(false);
    if (!res.ok) return;
    const json = await res.json();
    setHistory(
      (json.data.contactHistory as HistoryItem[]).map((h) => ({
        ...h,
        date: h.date,
        createdAt: h.createdAt,
      })),
    );
  }

  async function submitHistory(e: React.FormEvent) {
    e.preventDefault();
    if (!detailId || !hSummary.trim()) return;
    setHSaving(true);
    const res = await fetch(`/api/stakeholders/${detailId}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: hSummary, date: hDate }),
    });
    const json = await safeJson(res);
    setHSaving(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menyimpan");
      return;
    }
    setHistory((prev) => [json.data as HistoryItem, ...prev]);
    setRows((prev) =>
      prev.map((r) =>
        r.id === detailId ? { ...r, interactionCount: r.interactionCount + 1 } : r,
      ),
    );
    setHSummary("");
    setAddHistoryOpen(false);
    toast.success("Interaksi tercatat");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama atau no HP…"
            className="h-9 pl-8"
          />
        </div>
        <Select
          value={catFilter}
          onValueChange={(v) => v && setCatFilter(v as StakeholderCategory | "ALL")}
        >
          <SelectTrigger className="h-9 w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua kategori</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {STAKEHOLDER_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="sm:ml-auto">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Kontak
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={rows.length === 0 ? "Belum ada kontak stakeholder" : "Tidak ada yang cocok"}
          description={
            rows.length === 0
              ? "Simpan kontak RT/RW/PKK/Karang Taruna beserta riwayat interaksinya di sini."
              : "Coba ubah kata kunci pencarian atau filter kategori."
          }
          action={
            rows.length === 0 && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Tambah Kontak Pertama
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => (
            <Card
              key={s.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => openDetail(s.id)}
            >
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Badge variant="outline" className="mb-1 text-[10px]">
                      {STAKEHOLDER_CATEGORY_LABELS[s.category]}
                    </Badge>
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={pendingId === s.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(s.id);
                    }}
                    aria-label="Hapus kontak"
                  >
                    {pendingId === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </Button>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {s.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /> {s.phone}
                    </p>
                  )}
                  {s.address && (
                    <p className="line-clamp-1 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" /> {s.address}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between border-t pt-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {s.interactionCount} interaksi
                  </span>
                  <span>{formatDate(s.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Kontak Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="space-y-1.5">
                <Label htmlFor="s-name">
                  Nama <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="s-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Bpk. Suharto (Ketua RT 03)"
                  className="h-10"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select
                  value={category}
                  onValueChange={(v) => v && setCategory(v as StakeholderCategory)}
                  disabled={saving}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {STAKEHOLDER_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-phone">Nomor HP</Label>
              <Input
                id="s-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="h-10"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-addr">Alamat</Label>
              <Input
                id="s-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-10"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-notes">Catatan</Label>
              <textarea
                id="s-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan: preferensi komunikasi, jam paling responsif, dll."
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={saving}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Kontak
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail dialog with history */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>
                  <Badge variant="outline">
                    {STAKEHOLDER_CATEGORY_LABELS[detail.category]}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-2 text-sm">
                  {detail.phone && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <a
                        href={`tel:${detail.phone}`}
                        className="text-foreground hover:underline"
                      >
                        {detail.phone}
                      </a>
                    </p>
                  )}
                  {detail.address && (
                    <p className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="text-foreground">{detail.address}</span>
                    </p>
                  )}
                  {detail.notes && (
                    <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">
                      {detail.notes}
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold">Riwayat Interaksi</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddHistoryOpen(true)}
                    >
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Catat
                    </Button>
                  </div>
                  {loadingHistory ? (
                    <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                      Memuat…
                    </p>
                  ) : history.length === 0 ? (
                    <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                      Belum ada catatan interaksi.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {history.map((h) => (
                        <li key={h.id} className="rounded-md border bg-muted/30 p-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            {formatDate(h.date, { dateStyle: "medium" })} ·{" "}
                            {h.recordedBy.name}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm">{h.summary}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add history dialog */}
      <Dialog open={addHistoryOpen} onOpenChange={setAddHistoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Interaksi</DialogTitle>
            <DialogDescription>
              Riwayat komunikasi dengan stakeholder ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitHistory} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="h-date">Tanggal</Label>
              <Input
                id="h-date"
                type="date"
                value={hDate}
                onChange={(e) => setHDate(e.target.value)}
                className="h-10"
                disabled={hSaving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="h-summary">
                Ringkasan <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="h-summary"
                rows={4}
                value={hSummary}
                onChange={(e) => setHSummary(e.target.value)}
                placeholder="Contoh: koordinasi izin lokasi acara, disepakati…"
                className={cn(
                  "w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                disabled={hSaving}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddHistoryOpen(false)}
                disabled={hSaving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={hSaving || !hSummary.trim()}>
                {hSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
