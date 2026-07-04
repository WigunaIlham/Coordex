"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskPriority } from "@/lib/generated/prisma/client";
import { getInitials } from "@/lib/utils";
import type { AssigneeOption } from "./types";

const schema = z.object({
  title: z.string().min(1, "Judul wajib diisi").max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  points: z.number().int().min(1, "Min 1").max(10, "Max 10"),
  dueDate: z.string().optional(),
  assigneeIds: z.array(z.string()).min(1, "Pilih minimal 1 anggota"),
});

type FormInput = z.infer<typeof schema>;

import type { TaskCardData } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: AssigneeOption[];
  onSaved: (task: TaskCardData) => void;
  editTask?: TaskCardData | null;
};

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "LOW", label: "Rendah" },
  { value: "MEDIUM", label: "Sedang" },
  { value: "HIGH", label: "Tinggi" },
  { value: "URGENT", label: "Sangat Mendesak" },
];

export function TaskForm({ open, onOpenChange, members, onSaved, editTask }: Props) {
  const isEdit = !!editTask;
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      points: 3,
      dueDate: "",
      assigneeIds: [],
    },
  });
  const watchedPriority = watch("priority");

  useEffect(() => {
    if (open && editTask) {
      reset({
        title: editTask.title,
        description: editTask.description ?? "",
        priority: editTask.priority,
        points: editTask.points,
        dueDate: editTask.dueDate ? editTask.dueDate.slice(0, 10) : "",
        assigneeIds: editTask.assignees.map((a) => a.id),
      });
      setSelectedAssignees(editTask.assignees.map((a) => a.id));
    } else if (open && !editTask) {
      reset({
        title: "",
        description: "",
        priority: "MEDIUM",
        points: 3,
        dueDate: "",
        // Default: semua anggota aktif sudah tercentang. Bikin flow "assign
        // ke seluruh tim" jadi zero-click; kalau mau spesifik tinggal uncheck.
        assigneeIds: members.map((m) => m.id),
      });
      setSelectedAssignees(members.map((m) => m.id));
    }
  }, [open, editTask, reset, members]);

  function toggleAssignee(id: string) {
    setSelectedAssignees((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      setValue("assigneeIds", next, { shouldValidate: true });
      return next;
    });
  }

  function selectAll() {
    const ids = members.map((m) => m.id);
    setSelectedAssignees(ids);
    setValue("assigneeIds", ids, { shouldValidate: true });
  }

  function clearAll() {
    setSelectedAssignees([]);
    setValue("assigneeIds", [], { shouldValidate: true });
  }

  function selectByRole(rolePrefix: string) {
    // rolePrefix contoh: "PDD", "ACARA", "HUMLOG"
    const ids = members
      .filter((m) => m.role.includes(rolePrefix))
      .map((m) => m.id);
    if (ids.length === 0) return;
    // Merge dgn selection existing biar tetap bisa multi-divisi combine.
    setSelectedAssignees((prev) => {
      const next = Array.from(new Set([...prev, ...ids]));
      setValue("assigneeIds", next, { shouldValidate: true });
      return next;
    });
  }

  async function onSubmit(values: FormInput) {
    const url = isEdit ? `/api/tasks/${editTask!.id}` : "/api/tasks";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        description: values.description || undefined,
        dueDate: values.dueDate || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error?.message ?? (isEdit ? "Gagal menyimpan" : "Gagal membuat tugas"));
      return;
    }
    toast.success(isEdit ? "Tugas diperbarui" : "Tugas dibuat");
    const saved: TaskCardData = {
      id: json.data.id,
      title: json.data.title,
      description: json.data.description,
      status: json.data.status,
      priority: json.data.priority,
      points: json.data.points,
      dueDate: json.data.dueDate ?? null,
      createdBy: json.data.createdBy,
      assignees: json.data.assignees.map((a: { user: TaskCardData["assignees"][number] }) => a.user),
      attachmentCount: json.data._count?.attachments ?? editTask?.attachmentCount ?? 0,
    };
    reset();
    setSelectedAssignees([]);
    onOpenChange(false);
    onSaved(saved);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
      setSelectedAssignees([]);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Tugas" : "Tugas Baru"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ubah detail tugas berikut."
              : "Tetapkan tugas ke satu atau lebih anggota tim."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Judul <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              autoFocus
              disabled={isSubmitting}
              aria-invalid={!!errors.title}
              placeholder="Cetak spanduk pembukaan"
              className="h-10"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Deskripsi (opsional)</Label>
            <textarea
              id="description"
              rows={3}
              disabled={isSubmitting}
              placeholder="Ukuran, isi, deadline eksternal, dll."
              className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("description")}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Prioritas</Label>
              <Select
                value={watchedPriority}
                onValueChange={(v) => v && setValue("priority", v as TaskPriority)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="points">Poin (1–10)</Label>
              <Input
                id="points"
                type="number"
                min={1}
                max={10}
                inputMode="numeric"
                disabled={isSubmitting}
                className="h-10"
                {...register("points", { valueAsNumber: true })}
              />
              {errors.points && (
                <p className="text-xs text-destructive">{errors.points.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Tenggat (opsional)</Label>
              <Input
                id="dueDate"
                type="date"
                disabled={isSubmitting}
                className="h-10"
                {...register("dueDate")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label>
                Anggota yang Ditugaskan <span className="text-destructive">*</span>
              </Label>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {selectedAssignees.length} / {members.length} dipilih
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={selectAll}
              >
                Semua
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={clearAll}
              >
                Kosongkan
              </Button>
              <span className="mx-1 text-[10px] text-muted-foreground">
                Divisi:
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => selectByRole("PDD")}
              >
                + PDD
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => selectByRole("ACARA")}
              >
                + Acara
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => selectByRole("HUMLOG")}
              >
                + HumLog
              </Button>
            </div>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border p-2">
              {members.map((m) => {
                const checked = selectedAssignees.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={
                      "flex cursor-pointer items-center gap-3 rounded-md p-2 text-sm transition-colors " +
                      (checked ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "hover:bg-muted")
                    }
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleAssignee(m.id)}
                      aria-label={`Assign ${m.name}`}
                    />
                    <Avatar className="h-7 w-7 border">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium leading-tight">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[m.role]}</p>
                    </div>
                  </label>
                );
              })}
              {members.length === 0 && (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  Belum ada anggota aktif.
                </p>
              )}
            </div>
            {errors.assigneeIds && (
              <p className="text-sm text-destructive">{errors.assigneeIds.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Simpan" : "Buat Tugas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
