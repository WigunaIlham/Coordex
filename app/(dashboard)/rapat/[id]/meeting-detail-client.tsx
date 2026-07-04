"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEETING_STATUS_LABELS } from "@/lib/validators/meeting";
import type { MeetingStatus, Role } from "@/lib/generated/prisma/client";
import { cn, getInitials } from "@/lib/utils";

type Attendee = {
  userId: string;
  attended: boolean;
  notes: string | null;
  user: { id: string; name: string; avatarUrl: string | null; role: Role };
};

type Props = {
  meetingId: string;
  meetingTitle: string;
  status: MeetingStatus;
  canManage: boolean;
  canDelete: boolean;
  currentUserId: string;
  attendees: Attendee[];
  minutes: string;
};

const STATUSES: MeetingStatus[] = [
  "TERJADWAL",
  "BERLANGSUNG",
  "SELESAI",
  "DIBATALKAN",
];

export function MeetingDetailClient({
  meetingId,
  meetingTitle,
  status,
  canManage,
  canDelete,
  attendees: initialAttendees,
  minutes: initialMinutes,
}: Props) {
  const router = useRouter();
  const [attendees, setAttendees] = useState(initialAttendees);
  const [minutes, setMinutes] = useState(initialMinutes);
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<MeetingStatus>(status);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteMeeting() {
    setDeleting(true);
    const res = await fetch(`/api/meetings/${meetingId}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setDeleting(false);
      toast.error(json.error?.message ?? "Gagal menghapus rapat");
      return;
    }
    toast.success("Rapat dihapus");
    router.push("/rapat");
    router.refresh();
  }

  async function saveAttendance() {
    if (!canManage) return;
    const res = await fetch(`/api/meetings/${meetingId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendance: attendees.map((a) => ({
          userId: a.userId,
          attended: a.attended,
          notes: a.notes ?? undefined,
        })),
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error?.message ?? "Gagal simpan absensi");
      return;
    }
    toast.success("Absensi tersimpan");
    router.refresh();
  }

  async function saveMinutes() {
    if (!canManage) return;
    setSavingMinutes(true);
    const res = await fetch(`/api/meetings/${meetingId}/minutes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes }),
    });
    setSavingMinutes(false);
    if (!res.ok) {
      toast.error("Gagal simpan notulen");
      return;
    }
    toast.success("Notulen tersimpan");
    router.refresh();
  }

  async function changeStatus(value: MeetingStatus) {
    if (!canManage) return;
    setCurrentStatus(value);
    const res = await fetch(`/api/meetings/${meetingId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    if (!res.ok) {
      toast.error("Gagal ubah status");
      setCurrentStatus(status);
      return;
    }
    toast.success("Status diperbarui");
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {canManage && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <p className="text-xs text-muted-foreground">
              Ubah status rapat sesuai keadaan. <b>Dibatalkan</b> hanya
              menandai rapat sebagai batal (tetap muncul di Riwayat sebagai
              catatan). Untuk menghapus permanen, gunakan tombol hapus di
              bawah.
            </p>
          </CardHeader>
          <CardContent>
            <Select
              value={currentStatus}
              onValueChange={(v) => v && changeStatus(v as MeetingStatus)}
            >
              <SelectTrigger className="w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {MEETING_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentStatus === "DIBATALKAN" && (
              <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Rapat ini ditandai <b>dibatalkan</b>. Data tetap tersimpan
                  sebagai catatan/informasi.
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle className="text-base">Absensi</CardTitle>
            <span className="text-xs tabular-nums text-muted-foreground">
              {attendees.filter((a) => a.attended).length} / {attendees.length}{" "}
              hadir
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {attendees.map((a) => {
            const active = a.attended;
            return (
              <label
                key={a.userId}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                  active
                    ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                    : "border-input bg-muted/30 hover:bg-muted/50",
                  !canManage && "cursor-not-allowed opacity-90",
                )}
              >
                <Checkbox
                  checked={active}
                  disabled={!canManage}
                  onCheckedChange={(v) =>
                    setAttendees((prev) =>
                      prev.map((p) =>
                        p.userId === a.userId ? { ...p, attended: !!v } : p,
                      ),
                    )
                  }
                  aria-label={`Absensi ${a.user.name}`}
                />
                <Avatar className="h-8 w-8 border">
                  <AvatarImage src={a.user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(a.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium leading-tight">
                    {a.user.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[a.user.role]}
                  </p>
                </div>
                {active && (
                  <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Hadir
                  </span>
                )}
              </label>
            );
          })}
          {canManage && (
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={saveAttendance}>
                Simpan Absensi
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between gap-2">
            <CardTitle className="text-base">Notulen</CardTitle>
            <span className="text-xs tabular-nums text-muted-foreground">
              {minutes.length.toLocaleString("id-ID")} karakter
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {canManage
              ? "Ketua/Sekretaris dapat menulis. Tersimpan setelah tombol ditekan."
              : "Read-only. Hubungi Ketua/Sekretaris jika perlu koreksi."}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            rows={10}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            disabled={!canManage}
            placeholder="Tulis notulen rapat di sini…&#10;• Poin 1&#10;• Poin 2&#10;• Kesimpulan"
            className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
          />
          {canManage && (
            <div className="flex justify-end">
              <Button size="sm" onClick={saveMinutes} disabled={savingMinutes}>
                {savingMinutes && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Simpan Notulen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {canDelete && (
        <Card className="border-destructive/40 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Zona Bahaya
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Menghapus rapat akan menghapus <b>absensi</b> dan <b>notulen</b>{" "}
              yang terkait secara permanen. Tindakan ini tidak dapat dibatalkan
              — gunakan status <b>Dibatalkan</b> jika hanya ingin menandai
              rapat sebagai batal.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDeleteOpen(true)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Hapus Rapat Permanen
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={confirmDeleteOpen}
        onOpenChange={(v) => !v && !deleting && setConfirmDeleteOpen(false)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus rapat permanen?</DialogTitle>
            <DialogDescription>
              Rapat &quot;{meetingTitle}&quot; beserta absensi dan notulen
              akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMeeting}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
