"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckSquare,
  ClipboardList,
  Flag,
  Loader2,
  Pencil,
  Plus,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
// useEffect kept for edit-form reset side effect below
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { EmptyState } from "@/components/shared/empty-state";
import { ROLE_LABELS } from "@/components/layout/role-label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import type { Role } from "@/lib/generated/prisma/client";
import { formatDateTime, getInitials } from "@/lib/utils";

type Activity = {
  id: string;
  title: string;
  content: string;
  category: string;
  isMilestone: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatarUrl: string | null; role: Role };
};

const CATEGORY_BADGE_CLASS: Record<string, string> = {
  Kegiatan: "bg-green-50 text-green-700 border-green-200",
  Rapat: "bg-blue-50 text-blue-700 border-blue-200",
  Publikasi: "bg-purple-50 text-purple-700 border-purple-200",
  Keuangan: "bg-amber-50 text-amber-700 border-amber-200",
  Logistik: "bg-orange-50 text-orange-700 border-orange-200",
  Lainnya: "bg-slate-50 text-slate-700 border-slate-200",
};

const schema = z.object({
  title: z.string().min(1, "Judul wajib").max(200),
  content: z.string().min(1, "Konten wajib").max(5000),
  category: z.enum(ACTIVITY_CATEGORIES as unknown as readonly [string, ...string[]]),
  isMilestone: z.boolean(),
});
type Input = z.infer<typeof schema>;

export function ActivitiesClient({
  initialActivities,
  members,
  currentUserId,
  currentUserRole,
}: {
  initialActivities: Activity[];
  members: { id: string; name: string; role: Role }[];
  currentUserId: string;
  currentUserRole: Role;
}) {
  const router = useRouter();
  const [activities, setActivities] = useState(initialActivities);
  const [prevInitial, setPrevInitial] = useState(initialActivities);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [detail, setDetail] = useState<Activity | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterAuthor, setFilterAuthor] = useState<string>("ALL");
  const [milestoneOnly, setMilestoneOnly] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  if (prevInitial !== initialActivities) {
    setPrevInitial(initialActivities);
    setActivities(initialActivities);
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", content: "", category: "Lainnya", isMilestone: false },
  });
  const watchedCategory = watch("category");
  const watchedMilestone = watch("isMilestone");

  useEffect(() => {
    if (open && editing) {
      reset({
        title: editing.title,
        content: editing.content,
        category: editing.category as Input["category"],
        isMilestone: editing.isMilestone,
      });
    } else if (open && !editing) {
      reset({ title: "", content: "", category: "Lainnya", isMilestone: false });
    }
  }, [open, editing, reset]);

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (filterCategory !== "ALL" && a.category !== filterCategory) return false;
      if (filterAuthor !== "ALL" && a.author.id !== filterAuthor) return false;
      if (milestoneOnly && !a.isMilestone) return false;
      return true;
    });
  }, [activities, filterCategory, filterAuthor, milestoneOnly]);

  async function onSubmit(values: Input) {
    const url = editing ? `/api/activities/${editing.id}` : "/api/activities";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error?.message ?? (editing ? "Gagal menyimpan" : "Gagal memposting"));
      return;
    }
    const saved = json.data as Activity;
    setActivities((prev) => {
      const exists = prev.some((a) => a.id === saved.id);
      return exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...prev];
    });
    toast.success(editing ? "Aktivitas diperbarui" : "Update terposting");
    reset();
    setOpen(false);
    setEditing(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!detail) return;
    setDeleting(true);
    const res = await fetch(`/api/activities/${detail.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menghapus");
      return;
    }
    setActivities((prev) => prev.filter((a) => a.id !== detail.id));
    toast.success("Aktivitas dihapus");
    setConfirmDelete(false);
    setDetailOpen(false);
    setDetail(null);
    router.refresh();
  }

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(a: Activity) {
    setDetailOpen(false);
    setEditing(a);
    setOpen(true);
  }

  function openDetail(a: Activity) {
    setDetail(a);
    setConfirmDelete(false);
    setDetailOpen(true);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds(new Set(filtered.map((a) => a.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function exitSelectMode() {
    setSelectMode(false);
    clearSelection();
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    const res = await fetch("/api/activities/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json().catch(() => ({}));
    setBulkDeleting(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menghapus");
      return;
    }
    const deleted: number = json.data?.deleted ?? 0;
    setActivities((prev) => prev.filter((a) => !selectedIds.has(a.id)));
    setBulkDeleteOpen(false);
    exitSelectMode();
    if (deleted < ids.length) {
      toast.success(
        `${deleted} aktivitas dihapus (${
          ids.length - deleted
        } dilewati karena bukan milik Anda)`,
      );
    } else {
      toast.success(`${deleted} aktivitas dihapus`);
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filterCategory}
          onValueChange={(v) => v && setFilterCategory(v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua kategori</SelectItem>
            {ACTIVITY_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterAuthor}
          onValueChange={(v) => v && setFilterAuthor(v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Penulis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua penulis</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={milestoneOnly}
            onCheckedChange={(v) => setMilestoneOnly(!!v)}
          />
          Milestone saja
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!selectMode ? (
            <>
              <Button
                variant="outline"
                onClick={() => setSelectMode(true)}
                disabled={activities.length === 0}
              >
                <CheckSquare className="mr-2 h-4 w-4" /> Pilih
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Tambah Update
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={exitSelectMode}>
              <X className="mr-2 h-4 w-4" /> Selesai
            </Button>
          )}
        </div>
      </div>

      {selectMode && (
        <div className="sticky top-2 z-30 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
          <span className="text-sm font-medium">
            {selectedIds.size} dipilih
          </span>
          <span className="text-xs text-muted-foreground">
            dari {filtered.length} ditampilkan
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAllFiltered}
              disabled={filtered.length === 0}
            >
              <CheckSquare className="mr-2 h-4 w-4" /> Pilih semua
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={selectedIds.size === 0}
            >
              <Square className="mr-2 h-4 w-4" /> Kosongkan
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={selectedIds.size === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Hapus ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title="Belum ada aktivitas"
            description={
              activities.length === 0
                ? "Posting update pertama untuk memulai timeline tim."
                : "Tidak ada aktivitas yang cocok dengan filter Anda."
            }
            action={
              activities.length === 0 && (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" /> Tambah Update
                </Button>
              )
            }
          />
        )}
        {filtered.map((a) => {
          const isSelected = selectedIds.has(a.id);
          return (
          <article
            key={a.id}
            role="button"
            tabIndex={0}
            onClick={() => (selectMode ? toggleSelect(a.id) : openDetail(a))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (selectMode) toggleSelect(a.id);
                else openDetail(a);
              }
            }}
            className={
              "cursor-pointer rounded-md border bg-card p-4 text-card-foreground transition-colors hover:border-primary/40 hover:bg-muted/30 " +
              (selectMode && isSelected
                ? "border-primary/60 bg-primary/5"
                : "")
            }
          >
            <div className="flex items-start gap-3">
              {selectMode && (
                <div className="flex h-9 items-center">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(a.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Pilih ${a.title}`}
                  />
                </div>
              )}
              <Avatar className="h-9 w-9">
                <AvatarImage src={a.author.avatarUrl ?? undefined} />
                <AvatarFallback>{getInitials(a.author.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium">{a.author.name}</span>
                  <span className="text-muted-foreground">
                    · {ROLE_LABELS[a.author.role]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {formatDateTime(a.createdAt)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold">{a.title}</h3>
                  <Badge
                    variant="outline"
                    className={CATEGORY_BADGE_CLASS[a.category] ?? CATEGORY_BADGE_CLASS.Lainnya}
                  >
                    {a.category}
                  </Badge>
                  {a.isMilestone && (
                    <Badge className="bg-yellow-500/15 text-yellow-700">
                      <Flag className="mr-1 h-3 w-3" /> Milestone
                    </Badge>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
                  {a.content}
                </p>
              </div>
            </div>
          </article>
          );
        })}
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (v) {
            setOpen(true);
          } else {
            setOpen(false);
            setEditing(null);
            reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Aktivitas" : "Tambah Update Aktivitas"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Perbarui detail aktivitas."
                : "Update ini akan muncul di timeline tim."}
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
                placeholder="Contoh: Sudah rapat dengan RT setempat"
                className="h-10"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="content">
                Konten <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="content"
                rows={5}
                disabled={isSubmitting}
                aria-invalid={!!errors.content}
                placeholder="Ceritakan detailnya…"
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
                {...register("content")}
              />
              {errors.content && (
                <p className="text-xs text-destructive">{errors.content.message}</p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select
                  value={watchedCategory}
                  onValueChange={(v) => setValue("category", v as Input["category"])}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label
                className={
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm transition-colors " +
                  (watchedMilestone
                    ? "border-yellow-300 bg-yellow-50"
                    : "border-input hover:bg-muted")
                }
              >
                <Checkbox
                  checked={watchedMilestone}
                  onCheckedChange={(v) => setValue("isMilestone", !!v)}
                  aria-label="Tandai sebagai milestone"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-medium leading-tight">
                    Tandai Milestone
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Ditampilkan di sorotan tim
                  </p>
                </div>
              </label>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Simpan Perubahan" : "Posting Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          {detail && (() => {
            const canEdit = detail.author.id === currentUserId || currentUserRole === "KETUA";
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="pr-8 text-lg leading-snug">{detail.title}</DialogTitle>
                  <DialogDescription>Detail aktivitas</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={detail.author.avatarUrl ?? undefined} />
                      <AvatarFallback>{getInitials(detail.author.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium leading-tight">{detail.author.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[detail.author.role]} · {formatDateTime(detail.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={CATEGORY_BADGE_CLASS[detail.category] ?? CATEGORY_BADGE_CLASS.Lainnya}
                    >
                      {detail.category}
                    </Badge>
                    {detail.isMilestone && (
                      <Badge className="bg-yellow-500/15 text-yellow-700">
                        <Flag className="mr-1 h-3 w-3" /> Milestone
                      </Badge>
                    )}
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Konten</p>
                    <p className="whitespace-pre-wrap text-sm">{detail.content}</p>
                  </div>

                  {detail.updatedAt !== detail.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      Terakhir diperbarui: {formatDateTime(detail.updatedAt)}
                    </p>
                  )}
                </div>

                {confirmDelete ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                    <p className="mb-2 font-medium text-destructive">Hapus aktivitas ini?</p>
                    <p className="mb-3 text-muted-foreground">Tindakan ini tidak dapat dibatalkan.</p>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deleting}
                        onClick={() => setConfirmDelete(false)}
                      >
                        Batal
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={deleting}
                        onClick={handleDelete}
                      >
                        {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Hapus
                      </Button>
                    </div>
                  </div>
                ) : (
                  <DialogFooter className="gap-2 sm:justify-between">
                    <div>
                      {canEdit && (
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
                        onClick={() => setDetailOpen(false)}
                      >
                        Tutup
                      </Button>
                      {canEdit && (
                        <Button type="button" size="sm" onClick={() => openEdit(detail)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Button>
                      )}
                    </div>
                  </DialogFooter>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={(v) => !v && !bulkDeleting && setBulkDeleteOpen(false)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus {selectedIds.size} aktivitas?</DialogTitle>
            <DialogDescription>
              {currentUserRole === "KETUA" || currentUserRole === "SUPER_ADMIN"
                ? "Semua aktivitas yang dipilih akan dihapus permanen."
                : "Hanya aktivitas milik Anda yang akan terhapus. Aktivitas anggota lain akan dilewati."}
              <br />
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={bulkDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Hapus ({selectedIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
