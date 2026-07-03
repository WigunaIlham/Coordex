"use client";

import {
  AlertTriangle,
  CalendarClock,
  Loader2,
  Plus,
  Trash2,
  User2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACTION_ITEM_STATUS_LABELS,
  MEETING_STATUS_LABELS,
} from "@/lib/validators/meeting";
import type {
  ActionItemStatus,
  MeetingStatus,
  Role,
} from "@/lib/generated/prisma/client";
import { cn, formatDate, getInitials } from "@/lib/utils";

type Attendee = {
  userId: string;
  attended: boolean;
  notes: string | null;
  user: { id: string; name: string; avatarUrl: string | null; role: Role };
};

type ActionItem = {
  id: string;
  description: string;
  assignedToId: string;
  assignedTo: { id: string; name: string; avatarUrl: string | null };
  dueDate: string | null;
  status: ActionItemStatus;
};

const AI_STATUS_ORDER: ActionItemStatus[] = ["BELUM", "PROGRESS", "SELESAI"];

const AI_STATUS_CLASSES: Record<ActionItemStatus, string> = {
  BELUM: "border-slate-300 bg-slate-50 text-slate-700",
  PROGRESS: "border-blue-300 bg-blue-50 text-blue-700",
  SELESAI: "border-emerald-300 bg-emerald-50 text-emerald-700",
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
  actionItems: ActionItem[];
};

const STATUSES: MeetingStatus[] = ["TERJADWAL", "BERLANGSUNG", "SELESAI", "DIBATALKAN"];

export function MeetingDetailClient({
  meetingId,
  meetingTitle,
  status,
  canManage,
  canDelete,
  currentUserId,
  attendees: initialAttendees,
  minutes: initialMinutes,
  actionItems: initialActionItems,
}: Props) {
  const router = useRouter();
  const [attendees, setAttendees] = useState(initialAttendees);
  const [minutes, setMinutes] = useState(initialMinutes);
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [actionItems, setActionItems] = useState(initialActionItems);
  const [newDesc, setNewDesc] = useState("");
  const [newAssignee, setNewAssignee] = useState(attendees[0]?.userId ?? "");
  const [newDue, setNewDue] = useState("");
  const [addingAi, setAddingAi] = useState(false);
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

  async function addActionItem() {
    if (!canManage) return;
    if (!newDesc.trim() || !newAssignee) {
      toast.error("Deskripsi & penerima wajib");
      return;
    }
    setAddingAi(true);
    const res = await fetch(`/api/meetings/${meetingId}/action-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: newDesc,
        assignedToId: newAssignee,
        dueDate: newDue ? new Date(newDue).toISOString() : undefined,
      }),
    });
    setAddingAi(false);
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menambah");
      return;
    }
    setActionItems((prev) => [...prev, json.data]);
    setNewDesc("");
    setNewDue("");
    toast.success("Action item ditambahkan");
  }

  async function changeAiStatus(id: string, next: ActionItemStatus) {
    const item = actionItems.find((a) => a.id === id);
    if (!item) return;
    const isAssignee = item.assignedToId === currentUserId;
    if (!canManage && !isAssignee) {
      toast.error("Tidak ada akses");
      return;
    }
    const prev = item.status;
    setActionItems((list) =>
      list.map((a) => (a.id === id ? { ...a, status: next } : a))
    );
    const res = await fetch(`/api/meetings/${meetingId}/action-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      toast.error("Gagal update status");
      setActionItems((list) =>
        list.map((a) => (a.id === id ? { ...a, status: prev } : a))
      );
    }
  }

  async function deleteAi(id: string) {
    if (!canManage) return;
    if (!window.confirm("Hapus action item ini?")) return;
    const res = await fetch(`/api/meetings/${meetingId}/action-items/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Gagal hapus");
      return;
    }
    setActionItems((prev) => prev.filter((a) => a.id !== id));
    toast.success("Dihapus");
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
              <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
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
              {attendees.filter((a) => a.attended).length} / {attendees.length} hadir
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
                    ? "border-emerald-200 bg-emerald-50/60"
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
                  <p className="truncate font-medium leading-tight">{a.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[a.user.role]}
                  </p>
                </div>
                {active && (
                  <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-700">
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
                {savingMinutes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Notulen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>
            Action Items ({actionItems.filter((a) => a.status === "SELESAI").length}/
            {actionItems.length})
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Daftar tindak lanjut rapat: nama tugas, PIC, deadline, dan status.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {canManage && (
            <div className="grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-4">
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Nama tindak lanjut"
                className="sm:col-span-2"
              />
              <Select
                value={newAssignee}
                onValueChange={(v) => v && setNewAssignee(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="PIC" />
                </SelectTrigger>
                <SelectContent>
                  {attendees.map((a) => (
                    <SelectItem key={a.userId} value={a.userId}>
                      {a.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
                <Button onClick={addActionItem} disabled={addingAi} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {actionItems.length === 0 && (
            <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              Belum ada action item.
            </p>
          )}
          {actionItems.map((ai) => {
            const isAssignee = ai.assignedToId === currentUserId;
            const canEditStatus = canManage || isAssignee;
            const isOverdue =
              ai.dueDate && new Date(ai.dueDate) < new Date() && ai.status !== "SELESAI";
            return (
              <div
                key={ai.id}
                className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-[1fr_auto]"
              >
                <div className="space-y-2">
                  <p
                    className={cn(
                      "text-sm font-medium leading-snug",
                      ai.status === "SELESAI" && "text-muted-foreground line-through"
                    )}
                  >
                    {ai.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User2 className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">PIC:</span>
                      <span>{ai.assignedTo.name}</span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-muted-foreground",
                        isOverdue && "text-destructive"
                      )}
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">Deadline:</span>
                      <span>
                        {ai.dueDate
                          ? formatDate(ai.dueDate, { dateStyle: "medium" })
                          : "Tidak ada"}
                      </span>
                      {isOverdue && <span>(terlambat)</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:justify-end">
                  {canEditStatus ? (
                    <Select
                      value={ai.status}
                      onValueChange={(v) => v && changeAiStatus(ai.id, v as ActionItemStatus)}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_STATUS_ORDER.map((s) => (
                          <SelectItem key={s} value={s}>
                            {ACTION_ITEM_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={AI_STATUS_CLASSES[ai.status]}>
                      {ACTION_ITEM_STATUS_LABELS[ai.status]}
                    </Badge>
                  )}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAi(ai.id)}
                      aria-label="Hapus action item"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {canDelete && (
        <Card className="border-destructive/40 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Zona Bahaya
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Menghapus rapat akan menghapus <b>absensi</b>, <b>notulen</b>,
              dan <b>action item</b> yang terkait secara permanen. Tugas yang
              sudah dibuat dari action item tidak ikut terhapus. Tindakan ini
              tidak dapat dibatalkan — gunakan status <b>Dibatalkan</b> jika
              hanya ingin menandai rapat sebagai batal.
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
              Rapat &quot;{meetingTitle}&quot; beserta absensi, notulen, dan
              action item terkait akan dihapus permanen. Tindakan ini tidak
              dapat dibatalkan.
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
