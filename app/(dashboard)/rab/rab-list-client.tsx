"use client";

import { Calculator, FileText, Layers, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
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
import { formatRupiah } from "@/lib/services/rab.service";
import { formatDateTime } from "@/lib/utils";

type Row = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
  categoryCount: number;
  itemCount: number;
  grandTotal: number;
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
}: {
  initial: Row[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/rab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || null }),
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

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> RAB Baru
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Calculator}
          title="Belum ada RAB"
          description={
            canCreate
              ? "Susun rencana anggaran per kegiatan sekarang — subtotal & grand total dihitung otomatis."
              : "Belum ada dokumen RAB yang bisa dibuka. Hubungi Ketua atau Bendahara."
          }
          action={
            canCreate && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Buat RAB Pertama
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Card
              key={r.id}
              className="group relative flex flex-col overflow-hidden transition-colors hover:border-primary/40"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/70 via-primary/30 to-transparent"
              />
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
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
                  {canCreate && (
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>RAB Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="rab-title">Judul</Label>
              <Input
                id="rab-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="RAB Pembukaan KKN"
                disabled={saving}
              />
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
