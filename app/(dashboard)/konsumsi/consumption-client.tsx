"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/lib/generated/prisma/client";
import { cn, formatDate, getInitials } from "@/lib/utils";

type Duty = {
  id: string;
  date: string;
  members: { id: string; name: string; avatarUrl: string | null; role: Role }[];
};

type Swap = {
  id: string;
  requesterId: string;
  targetId: string;
  requester: { id: string; name: string };
  target: { id: string; name: string };
  duty: { id: string; date: string };
  reason: string | null;
};

type Member = { id: string; name: string; role: Role };

type DutyType = "KONSUMSI" | "PIKET";

type Props = {
  currentUserId: string;
  isKetua: boolean;
  initialDuties: Duty[];
  members: Member[];
  initialSwaps: Swap[];
  dutyType?: DutyType;
};

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function ConsumptionClient({
  currentUserId,
  isKetua,
  initialDuties,
  members,
  initialSwaps,
  dutyType = "KONSUMSI",
}: Props) {
  const dutyLabel = dutyType === "PIKET" ? "piket" : "konsumsi";
  const router = useRouter();
  const [duties, setDuties] = useState(initialDuties);
  const [swaps, setSwaps] = useState(initialSwaps);
  const [prevInitialDuties, setPrevInitialDuties] = useState(initialDuties);
  const [prevInitialSwaps, setPrevInitialSwaps] = useState(initialSwaps);
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [detailDuty, setDetailDuty] = useState<Duty | null>(null);

  // React 19 derived state pattern — resync when server component refetches.
  if (prevInitialDuties !== initialDuties) {
    setPrevInitialDuties(initialDuties);
    setDuties(initialDuties);
  }
  if (prevInitialSwaps !== initialSwaps) {
    setPrevInitialSwaps(initialSwaps);
    setSwaps(initialSwaps);
  }

  const dutyByDate = useMemo(() => {
    const map = new Map<string, Duty>();
    for (const d of duties) {
      map.set(d.date.slice(0, 10), d);
    }
    return map;
  }, [duties]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  // Manual create/edit dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDate, setEditorDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [editorSelected, setEditorSelected] = useState<Set<string>>(new Set());
  const [editorDutyId, setEditorDutyId] = useState<string | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);

  // Delete confirmation
  const [deleteDuty, setDeleteDuty] = useState<Duty | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Swap dialog
  const [swapDuty, setSwapDuty] = useState<Duty | null>(null);
  const [swapTarget, setSwapTarget] = useState<string>("");
  const [swapReason, setSwapReason] = useState("");
  const [swapSubmitting, setSwapSubmitting] = useState(false);

  function openCreate(dateStr?: string) {
    setEditorDutyId(null);
    setEditorDate(dateStr ?? new Date().toISOString().slice(0, 10));
    setEditorSelected(new Set());
    setEditorOpen(true);
  }

  function openEdit(duty: Duty) {
    setDetailDuty(null);
    setEditorDutyId(duty.id);
    setEditorDate(duty.date.slice(0, 10));
    setEditorSelected(new Set(duty.members.map((m) => m.id)));
    setEditorOpen(true);
  }

  function toggleMember(id: string) {
    setEditorSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveDuty() {
    if (!editorDate) {
      toast.error("Pilih tanggal");
      return;
    }
    if (editorSelected.size === 0) {
      toast.error("Pilih minimal 1 anggota");
      return;
    }
    setEditorSaving(true);
    const url = editorDutyId
      ? `/api/consumption/schedule/${editorDutyId}`
      : "/api/consumption/schedule";
    const method = editorDutyId ? "PUT" : "POST";
    const body = editorDutyId
      ? { userIds: Array.from(editorSelected) }
      : {
          date: editorDate,
          userIds: Array.from(editorSelected),
          type: dutyType,
        };
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setEditorSaving(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menyimpan");
      return;
    }
    toast.success(editorDutyId ? "Jadwal diperbarui" : "Jadwal dibuat");
    setEditorOpen(false);
    router.refresh();
  }

  async function confirmDeleteDuty() {
    if (!deleteDuty) return;
    setDeleting(true);
    const res = await fetch(`/api/consumption/schedule/${deleteDuty.id}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menghapus");
      return;
    }
    toast.success("Jadwal dihapus");
    setDeleteDuty(null);
    router.refresh();
  }

  async function submitSwap() {
    if (!swapDuty) return;
    if (!swapTarget) {
      toast.error("Pilih target");
      return;
    }
    setSwapSubmitting(true);
    const res = await fetch("/api/consumption/swaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dutyId: swapDuty.id,
        targetId: swapTarget,
        reason: swapReason || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSwapSubmitting(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal request swap");
      return;
    }
    toast.success("Permintaan terkirim");
    setSwaps((prev) => [json.data, ...prev]);
    setSwapDuty(null);
    setSwapTarget("");
    setSwapReason("");
  }

  async function decideSwap(id: string, decision: "DISETUJUI" | "DITOLAK") {
    const res = await fetch(`/api/consumption/swaps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: decision }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error?.message ?? "Gagal memutuskan");
      return;
    }
    setSwaps((prev) => prev.filter((s) => s.id !== id));
    toast.success(decision === "DISETUJUI" ? "Tukar disetujui" : "Tukar ditolak");
    router.refresh();
  }

  function openDay(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    const duty = dutyByDate.get(key);
    if (duty) {
      setDetailDuty(duty);
    } else if (isKetua) {
      openCreate(key);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCursor(addMonths(cursor, -1))}
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[160px] text-center text-sm font-semibold">
            {format(cursor, "MMMM yyyy", { locale: idLocale })}
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCursor(addMonths(cursor, 1))}
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Hari ini
          </Button>
        </div>
        {isKetua && (
          <Button onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" /> Buat Jadwal
          </Button>
        )}
      </div>

      {/* Swap requests */}
      {swaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Permintaan Tukar Jadwal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {swaps.map((s) => {
              const canDecide = isKetua || s.targetId === currentUserId;
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {s.requester.name} → {s.target.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Untuk tanggal {formatDate(s.duty.date)}
                      {s.reason ? ` · "${s.reason}"` : ""}
                    </p>
                  </div>
                  {canDecide ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decideSwap(s.id, "DITOLAK")}
                      >
                        Tolak
                      </Button>
                      <Button size="sm" onClick={() => decideSwap(s.id, "DISETUJUI")}>
                        Setujui
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="outline">Menunggu</Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-md border bg-background">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="p-2 text-center text-muted-foreground">
              {wd}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const duty = dutyByDate.get(key);
            const inMonth = isSameMonth(day, cursor);
            const userOnDuty = duty?.members.some((m) => m.id === currentUserId);
            const today = isToday(day);

            return (
              <button
                key={key}
                type="button"
                onClick={() => openDay(day)}
                disabled={!duty && !isKetua}
                className={cn(
                  "flex min-h-[92px] flex-col items-start gap-1 border-b border-r p-2 text-left transition-colors",
                  !inMonth && "bg-muted/20 text-muted-foreground",
                  duty && "cursor-pointer hover:bg-primary/5",
                  !duty && isKetua && "cursor-pointer hover:bg-primary/5",
                  !duty && !isKetua && "cursor-default",
                  userOnDuty &&
                    "bg-emerald-50 text-emerald-950 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-100 dark:hover:bg-emerald-500/25",
                  today && "ring-2 ring-inset ring-primary/60",
                )}
              >
                <div className="flex w-full items-center justify-between text-xs">
                  <span
                    className={cn(
                      "font-medium",
                      today && "rounded-full bg-primary px-2 text-primary-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {userOnDuty && (
                    <Badge className="h-4 bg-emerald-600 px-1.5 py-0 text-[9px] text-white dark:bg-emerald-500 dark:text-emerald-950">
                      Anda
                    </Badge>
                  )}
                </div>
                {duty && (
                  <div className="flex flex-wrap gap-0.5">
                    {duty.members.slice(0, 3).map((m) => (
                      <Avatar
                        key={m.id}
                        className="h-5 w-5 border border-background"
                        title={m.name}
                      >
                        <AvatarImage src={m.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[8px]">
                          {getInitials(m.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {duty.members.length > 3 && (
                      <div className="flex h-5 items-center justify-center rounded-full border border-background bg-muted px-1 text-[9px] font-medium">
                        +{duty.members.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300 dark:bg-emerald-500/20 dark:ring-emerald-500/60" />
          Anda petugas
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-background ring-1 ring-primary/60" />
          Hari ini
        </div>
        <span>
          · Klik hari yang ada avatar untuk detail &amp; tukar
          {isKetua && ", atau hari kosong untuk buat jadwal"}.
        </span>
      </div>

      {/* Day detail dialog */}
      <Dialog open={!!detailDuty} onOpenChange={(o) => !o && setDetailDuty(null)}>
        <DialogContent className="sm:max-w-md">
          {detailDuty && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {formatDate(detailDuty.date, { dateStyle: "full" })}
                </DialogTitle>
                <DialogDescription>
                  {detailDuty.members.length} anggota bertugas {dutyLabel}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {detailDuty.members.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-2",
                      m.id === currentUserId &&
                        "border-emerald-300 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/10",
                    )}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={m.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[m.role]}</p>
                    </div>
                    {m.id === currentUserId && (
                      <Badge className="bg-emerald-600 text-white">Anda</Badge>
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <div className="flex gap-2">
                  {isKetua && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const d = detailDuty;
                          setDetailDuty(null);
                          setDeleteDuty(d);
                        }}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Hapus
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(detailDuty)}
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setDetailDuty(null)}>
                    Tutup
                  </Button>
                  {detailDuty.members.some((m) => m.id === currentUserId) && (
                    <Button
                      onClick={() => {
                        const firstOther = members.find((m) => m.id !== currentUserId);
                        setSwapTarget(firstOther?.id ?? "");
                        setSwapDuty(detailDuty);
                        setDetailDuty(null);
                      }}
                    >
                      <ArrowLeftRight className="mr-2 h-4 w-4" /> Ajukan Tukar
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual create/edit dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editorDutyId
                ? "Edit Jadwal"
                : `Buat Jadwal ${dutyType === "PIKET" ? "Piket" : "Konsumsi"}`}
            </DialogTitle>
            <DialogDescription>
              Pilih tanggal dan centang anggota yang bertugas hari itu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dt-date">
                Tanggal <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dt-date"
                type="date"
                value={editorDate}
                onChange={(e) => setEditorDate(e.target.value)}
                disabled={!!editorDutyId}
                className="h-10"
              />
              {editorDutyId && (
                <p className="text-[11px] text-muted-foreground">
                  Tanggal tidak dapat diubah untuk jadwal yang sudah ada.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label>
                  Anggota bertugas{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground">
                    {editorSelected.size} / {members.length}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setEditorSelected(new Set(members.map((m) => m.id)))
                    }
                  >
                    Semua
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setEditorSelected(new Set())}
                  >
                    Kosongkan
                  </Button>
                </div>
              </div>
              <div className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
                {members.map((m) => {
                  const checked = editorSelected.has(m.id);
                  return (
                    <label
                      key={m.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-md border p-2 text-sm transition-colors",
                        checked
                          ? "border-primary/40 bg-primary/5"
                          : "border-transparent hover:bg-muted",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleMember(m.id)}
                        aria-label={`Pilih ${m.name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight">
                          {m.name}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {ROLE_LABELS[m.role]}
                        </p>
                      </div>
                      {checked && (
                        <Check className="h-4 w-4 text-primary" aria-hidden />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => setEditorOpen(false)}
              disabled={editorSaving}
            >
              Batal
            </Button>
            <Button onClick={saveDuty} disabled={editorSaving}>
              {editorSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editorDutyId ? "Simpan Perubahan" : "Buat Jadwal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteDuty}
        onOpenChange={(o) => !o && !deleting && setDeleteDuty(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus jadwal ini?</DialogTitle>
            <DialogDescription>
              {deleteDuty && (
                <>
                  Jadwal tanggal{" "}
                  <span className="font-medium text-foreground">
                    {formatDate(deleteDuty.date, { dateStyle: "full" })}
                  </span>{" "}
                  beserta permintaan tukar yang belum diproses akan dihapus
                  permanen.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDuty(null)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteDuty}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Swap dialog */}
      <Dialog open={!!swapDuty} onOpenChange={(o) => !o && setSwapDuty(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajukan Tukar Jadwal</DialogTitle>
            <DialogDescription>
              {swapDuty && (
                <>
                  Anda bertugas pada{" "}
                  <span className="font-medium text-foreground">
                    {formatDate(swapDuty.date, { dateStyle: "full" })}
                  </span>
                  . Pilih anggota untuk tukar jadwal.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Tukar dengan <span className="text-destructive">*</span>
              </Label>
              <Select value={swapTarget} onValueChange={(v) => v && setSwapTarget(v)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Pilih anggota" />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter((m) => m.id !== currentUserId)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="swap-reason">Alasan (opsional)</Label>
              <textarea
                id="swap-reason"
                rows={3}
                value={swapReason}
                onChange={(e) => setSwapReason(e.target.value)}
                placeholder="Kenapa perlu tukar? Contoh: ada acara keluarga…"
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">
                Alasan hanya terlihat oleh target &amp; Ketua saat approval.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setSwapDuty(null)} disabled={swapSubmitting}>
              Batal
            </Button>
            <Button onClick={submitSwap} disabled={swapSubmitting}>
              {swapSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kirim Permintaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
