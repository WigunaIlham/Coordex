"use client";

import { CalendarIcon, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { PRIORITY_META, STATUS_COLUMNS } from "@/components/tasks/task-meta";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Role } from "@/lib/generated/prisma/client";
import { cn, formatDate, getInitials } from "@/lib/utils";
import type { TaskCardData } from "./types";

type Props = {
  task: TaskCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  currentUserRole: Role;
  onEdit: (task: TaskCardData) => void;
  onDeleted: (taskId: string) => void;
};

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  currentUserId,
  currentUserRole,
  onEdit,
  onDeleted,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!task) return null;

  const priority = PRIORITY_META[task.priority];
  const statusLabel =
    STATUS_COLUMNS.find((s) => s.value === task.status)?.label ?? task.status;
  const isCreator = task.createdBy.id === currentUserId;
  const isAdminOrKetua =
    currentUserRole === "KETUA" || currentUserRole === "SUPER_ADMIN";
  const canEdit = isCreator || isAdminOrKetua;
  const canDelete = isAdminOrKetua;
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  async function handleDelete() {
    if (!task) return;
    setDeleting(true);
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menghapus");
      return;
    }
    toast.success("Tugas dihapus");
    onDeleted(task.id);
    setConfirmDelete(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-8 text-lg leading-snug">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("border", priority.badgeClass)}>
              {priority.label}
            </Badge>
            <Badge variant="outline">{statusLabel}</Badge>
            <Badge variant="outline">{task.points} poin</Badge>
            {task.attachmentCount > 0 && (
              <Badge variant="outline">{task.attachmentCount} lampiran</Badge>
            )}
          </div>

          {task.description ? (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Deskripsi</p>
              <p className="whitespace-pre-wrap text-sm">{task.description}</p>
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">Tanpa deskripsi.</p>
          )}

          {task.dueDate && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Tenggat</p>
              <div
                className={cn(
                  "flex items-center gap-1.5 text-sm",
                  isOverdue && "text-destructive"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {formatDate(task.dueDate, { dateStyle: "full" })}
                {isOverdue && <span className="text-xs">(terlambat)</span>}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Ditugaskan ke ({task.assignees.length})
            </p>
            <div className="space-y-1.5">
              {task.assignees.map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={a.avatarUrl ?? undefined} alt={a.name} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(a.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <p className="font-medium leading-tight">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[a.role]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Dibuat oleh</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={task.createdBy.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(task.createdBy.name)}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm">{task.createdBy.name}</p>
            </div>
          </div>
        </div>

        {confirmDelete ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="mb-2 font-medium text-destructive">Hapus tugas ini?</p>
            <p className="mb-3 text-muted-foreground">
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
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
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Hapus
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {canDelete && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Hapus
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Tutup
              </Button>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onEdit(task);
                    onOpenChange(false);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
