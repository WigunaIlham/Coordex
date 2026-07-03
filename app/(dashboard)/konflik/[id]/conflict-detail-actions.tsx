"use client";

import {
  CheckCircle2,
  Circle,
  Loader2,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ConflictStatus } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";
import { CONFLICT_STATUS_LABELS } from "@/lib/validators/conflict";

type Props = {
  id: string;
  status: ConflictStatus;
  resolutionNotes: string | null;
};

const STATUSES: {
  value: ConflictStatus;
  icon: typeof Circle;
  tone: string;
}[] = [
  { value: "OPEN", icon: Circle, tone: "rose" },
  { value: "DISKUSI", icon: MessageCircle, tone: "amber" },
  { value: "SELESAI", icon: CheckCircle2, tone: "emerald" },
];

const TONE_CLASSES: Record<string, { active: string; hover: string }> = {
  rose: {
    active: "border-rose-300 bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
    hover: "hover:border-rose-200",
  },
  amber: {
    active: "border-amber-300 bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    hover: "hover:border-amber-200",
  },
  emerald: {
    active:
      "border-emerald-300 bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    hover: "hover:border-emerald-200",
  },
};

const MAX_NOTES = 2000;

export function ConflictDetailActions({ id, status, resolutionNotes }: Props) {
  const router = useRouter();
  const [newStatus, setNewStatus] = useState<ConflictStatus>(status);
  const [notes, setNotes] = useState(resolutionNotes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty =
    newStatus !== status || (notes || null) !== (resolutionNotes ?? null);

  async function save() {
    setSubmitting(true);
    const res = await fetch(`/api/conflicts/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        resolutionNotes: notes || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menyimpan");
      return;
    }
    toast.success("Laporan diperbarui");
    // Setelah simpan sukses, kembali ke daftar dengan filter status yang
    // baru saja di-set — biar Ketua langsung lihat laporan di posisi kolomnya.
    router.push(`/konflik?status=${newStatus}`);
    router.refresh();
  }

  async function onDelete() {
    setDeleting(true);
    const res = await fetch(`/api/conflicts/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menghapus");
      return;
    }
    toast.success("Laporan dihapus");
    router.push("/konflik");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tindak Lanjut</CardTitle>
        <p className="text-xs text-muted-foreground">
          Pilih status dan tulis catatan resolusi. Hanya Anda (Ketua/Admin) yang
          dapat mengubah bagian ini.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Status</Label>
          <div
            role="radiogroup"
            aria-label="Status laporan"
            className="grid gap-2 sm:grid-cols-3"
          >
            {STATUSES.map((s) => {
              const active = newStatus === s.value;
              const Icon = s.icon;
              const tone = TONE_CLASSES[s.tone];
              return (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setNewStatus(s.value)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active
                      ? tone.active
                      : `border-input bg-background text-muted-foreground ${tone.hover}`,
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium">
                    {CONFLICT_STATUS_LABELS[s.value]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="resolutionNotes">
              Catatan Resolusi
              {newStatus === "SELESAI" && (
                <span className="text-destructive"> *</span>
              )}
            </Label>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {notes.length} / {MAX_NOTES}
            </span>
          </div>
          <textarea
            id="resolutionNotes"
            rows={5}
            maxLength={MAX_NOTES}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ringkasan diskusi, langkah resolusi, atau alasan status berubah…"
            className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-[11px] text-muted-foreground">
            Catatan ini terlihat oleh pelapor sebagai konfirmasi tindak lanjut.
          </p>
        </div>

        {confirmDelete ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="mb-1 font-medium text-destructive">Hapus laporan ini?</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Laporan beserta catatan resolusi akan dihapus permanen. Tindakan
              ini tidak dapat dibatalkan.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onDelete}
                disabled={deleting}
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ya, Hapus Permanen
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            {dirty ? (
              <span className="text-xs text-amber-600">
                Ada perubahan belum disimpan
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Semua tersimpan
              </span>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                disabled={submitting || deleting}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Hapus Laporan
              </Button>
              <Button
                onClick={save}
                disabled={submitting || deleting || !dirty}
                className="sm:w-auto"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
