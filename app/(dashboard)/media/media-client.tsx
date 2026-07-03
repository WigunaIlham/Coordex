"use client";

import {
  Film,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { MediaStatus, MediaType } from "@/lib/generated/prisma/client";
import { cn, formatDate, getInitials } from "@/lib/utils";
import {
  MEDIA_STATUS_LABELS,
  MEDIA_TYPE_LABELS,
} from "@/lib/validators/media";

type MediaItem = {
  id: string;
  type: MediaType;
  title: string;
  caption: string | null;
  event: string | null;
  status: MediaStatus;
  uploadedBy: { id: string; name: string; avatarUrl: string | null };
  approvedBy: { id: string; name: string } | null;
  createdAt: string;
};

const STATUSES: MediaStatus[] = ["DRAFT", "EDITING", "APPROVED", "PUBLISHED"];

const STATUS_STYLE: Record<MediaStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  EDITING: "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVED: "bg-blue-50 text-blue-700 ring-blue-200",
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
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

export function MediaClient({ initial }: { initial: MediaItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string | null>>({});
  const [statusFilter, setStatusFilter] = useState<MediaStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<MediaType | "ALL">("ALL");
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Upload dialog state
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [type, setType] = useState<MediaType>("FOTO");
  const [title, setTitle] = useState("");
  const [event, setEvent] = useState("");
  const [caption, setCaption] = useState("");

  // Preview dialog
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Lazy-load thumbnails (batch)
  useEffect(() => {
    const ids = items.filter((it) => it.type === "FOTO").map((it) => it.id);
    if (ids.length === 0) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/media/urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok || !alive) return;
        const json = (await res.json()) as { data: Record<string, string | null> };
        setThumbUrls(json.data ?? {});
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [items]);

  const visible = useMemo(() => {
    return items.filter((it) => {
      if (statusFilter !== "ALL" && it.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && it.type !== typeFilter) return false;
      return true;
    });
  }, [items, statusFilter, typeFilter]);

  const stageCounts = useMemo(() => {
    const map: Record<MediaStatus, number> = {
      DRAFT: 0,
      EDITING: 0,
      APPROVED: 0,
      PUBLISHED: 0,
    };
    for (const it of items) map[it.status]++;
    return map;
  }, [items]);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    try {
      const form = new FormData(e.currentTarget);
      form.set("type", type);
      const res = await fetch("/api/media", { method: "POST", body: form });
      const json = await safeJson(res);
      if (!res.ok) {
        toast.error(json.error?.message ?? "Gagal upload");
        return;
      }
      setItems((prev) => [json.data as MediaItem, ...prev]);
      setTitle("");
      setEvent("");
      setCaption("");
      setOpen(false);
      toast.success("Aset media diupload");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setUploading(false);
    }
  }

  async function updateStatus(id: string, status: MediaStatus) {
    setPendingId(id);
    const res = await fetch(`/api/media/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPendingId(null);
    if (!res.ok) {
      toast.error("Gagal update status");
      return;
    }
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status } : it)),
    );
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!window.confirm("Hapus aset ini dari storage?")) return;
    setPendingId(id);
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    setPendingId(null);
    if (!res.ok) {
      toast.error("Gagal menghapus");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.success("Terhapus");
    router.refresh();
  }

  async function openPreview(item: MediaItem) {
    setPreview(item);
    setPreviewOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Pipeline stats */}
      <div className="grid gap-2 sm:grid-cols-4">
        {STATUSES.map((s) => (
          <div
            key={s}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-inset",
              STATUS_STYLE[s],
            )}
          >
            <div className="flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">
                {MEDIA_STATUS_LABELS[s]}
              </p>
              <p className="text-lg font-semibold leading-tight tabular-nums">
                {stageCounts[s]}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={typeFilter}
          onValueChange={(v) => v && setTypeFilter(v as MediaType | "ALL")}
        >
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue placeholder="Tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua tipe</SelectItem>
            <SelectItem value="FOTO">Foto</SelectItem>
            <SelectItem value="VIDEO">Video</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => v && setStatusFilter(v as MediaStatus | "ALL")}
        >
          <SelectTrigger className="h-9 w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {MEDIA_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="sm:ml-auto">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload Aset
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={items.length === 0 ? "Belum ada aset media" : "Tidak ada yang cocok"}
          description={
            items.length === 0
              ? "Simpan foto & video kegiatan untuk arsip dan publikasi tim."
              : "Coba ubah filter."
          }
          action={
            items.length === 0 && (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Upload Pertama
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((m) => (
            <div
              key={m.id}
              className="group overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40"
            >
              {/* Media preview */}
              <button
                type="button"
                onClick={() => openPreview(m)}
                className="relative block aspect-video w-full overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Buka ${m.title}`}
              >
                {m.type === "FOTO" && thumbUrls[m.id] ? (
                  // Signed URL — use plain <img> (URL rotates hourly).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbUrls[m.id] ?? undefined}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    {m.type === "VIDEO" ? (
                      <Film className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="absolute left-2 top-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "border-transparent bg-background/90 text-[9px] font-semibold uppercase backdrop-blur",
                    )}
                  >
                    {MEDIA_TYPE_LABELS[m.type]}
                  </Badge>
                </div>
                <div className="absolute right-2 top-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] font-semibold uppercase ring-1 ring-inset backdrop-blur",
                      STATUS_STYLE[m.status],
                    )}
                  >
                    {MEDIA_STATUS_LABELS[m.status]}
                  </Badge>
                </div>
              </button>

              {/* Body */}
              <div className="space-y-2 p-3">
                <div>
                  <p className="line-clamp-1 text-sm font-medium">{m.title}</p>
                  {m.event && (
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">
                      {m.event}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Avatar className="h-5 w-5 border">
                    <AvatarImage src={m.uploadedBy.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[8px]">
                      {getInitials(m.uploadedBy.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{m.uploadedBy.name}</span>
                  <span>·</span>
                  <span>{formatDate(m.createdAt, { dateStyle: "medium" })}</span>
                </div>
                <div className="flex items-center gap-2 border-t pt-2">
                  <Select
                    value={m.status}
                    onValueChange={(v) => v && updateStatus(m.id, v as MediaStatus)}
                    disabled={pendingId === m.id}
                  >
                    <SelectTrigger className="h-7 flex-1 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {MEDIA_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={pendingId === m.id}
                    onClick={() => onDelete(m.id)}
                    aria-label="Hapus"
                  >
                    {pendingId === m.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Aset Media</DialogTitle>
            <DialogDescription>
              Foto max 25 MB, video max 100 MB. Aset masuk pipeline dengan status Draft.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onUpload} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipe</Label>
                <Select
                  value={type}
                  onValueChange={(v) => v && setType(v as MediaType)}
                  disabled={uploading}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FOTO">Foto</SelectItem>
                    <SelectItem value="VIDEO">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-event">Kegiatan (opsional)</Label>
                <Input
                  id="m-event"
                  name="event"
                  value={event}
                  onChange={(e) => setEvent(e.target.value)}
                  placeholder="Contoh: Pembukaan KKN"
                  className="h-10"
                  disabled={uploading}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-title">
                Judul <span className="text-destructive">*</span>
              </Label>
              <Input
                id="m-title"
                name="title"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul singkat"
                className="h-10"
                disabled={uploading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-caption">Caption</Label>
              <textarea
                id="m-caption"
                name="caption"
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Deskripsi singkat untuk publikasi…"
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={uploading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-file">
                File <span className="text-destructive">*</span>
              </Label>
              <Input
                id="m-file"
                name="file"
                type="file"
                required
                accept={type === "VIDEO" ? "video/*" : "image/*"}
                disabled={uploading}
                className="h-10 cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
              />
              <p className="text-[11px] text-muted-foreground">
                {type === "VIDEO" ? "Maksimal 100 MB." : "Maksimal 25 MB."}
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={uploading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={uploading || !title.trim()}>
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{preview.title}</DialogTitle>
                {preview.event && (
                  <DialogDescription>{preview.event}</DialogDescription>
                )}
              </DialogHeader>
              <MediaPreview id={preview.id} type={preview.type} />
              {preview.caption && (
                <p className="whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-sm">
                  {preview.caption}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                <Badge
                  variant="outline"
                  className={cn("text-[10px] ring-1 ring-inset", STATUS_STYLE[preview.status])}
                >
                  {MEDIA_STATUS_LABELS[preview.status]}
                </Badge>
                <span>·</span>
                <span>Diupload {preview.uploadedBy.name}</span>
                {preview.approvedBy && (
                  <>
                    <span>·</span>
                    <span>Approved {preview.approvedBy.name}</span>
                  </>
                )}
                <span className="ml-auto">
                  {formatDate(preview.createdAt, { dateStyle: "medium" })}
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Preview fetcher — signs the URL on-demand when the user opens the dialog.
 * Avoids upfront signing of every asset for pages the user might not visit.
 */
function MediaPreview({ id, type }: { id: string; type: MediaType }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/media/${id}`);
      setLoading(false);
      if (!res.ok || !alive) return;
      const json = await res.json();
      setUrl(json.data.signedUrl ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-md bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
        Preview tidak dapat dimuat.
      </div>
    );
  }
  if (type === "VIDEO") {
    return (
      <video
        src={url}
        controls
        className="aspect-video w-full rounded-md bg-black"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="w-full rounded-md object-contain" />
  );
}
