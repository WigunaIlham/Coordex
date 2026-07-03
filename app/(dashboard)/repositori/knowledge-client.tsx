"use client";

import {
  Download,
  FileText,
  Folder,
  Loader2,
  Search,
  Trash2,
  Upload,
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
import { formatDateTime } from "@/lib/utils";
import { KNOWLEDGE_FOLDERS } from "@/lib/validators/knowledge";

type KFile = {
  id: string;
  title: string;
  description: string | null;
  folder: string;
  tags: string[];
  fileName: string;
  fileSize: number | null;
  fileType: string | null;
  version: number;
  uploadedById: string;
  uploadedBy: { id: string; name: string };
  createdAt: string;
};

function formatBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function KnowledgeClient({
  initialFiles,
  currentUserId,
  isKetua,
}: {
  initialFiles: KFile[];
  currentUserId: string;
  isKetua: boolean;
}) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  const [folder, setFolder] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const visible = useMemo(() => {
    return files.filter((f) => {
      if (folder !== "ALL" && f.folder !== folder) return false;
      if (q) {
        const lc = q.toLowerCase();
        return (
          f.title.toLowerCase().includes(lc) ||
          f.tags.some((t) => t.toLowerCase().includes(lc))
        );
      }
      return true;
    });
  }, [files, folder, q]);

  async function safeJson(res: Response): Promise<{ data?: unknown; error?: { message?: string } }> {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { error: { message: `Server mengembalikan respons tidak valid (${res.status})` } };
    }
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    try {
      const form = new FormData(e.currentTarget);
      const res = await fetch("/api/knowledge", { method: "POST", body: form });
      const json = await safeJson(res);
      if (!res.ok) {
        toast.error(json.error?.message ?? "Gagal upload");
        return;
      }
      setFiles((prev) => [json.data as KFile, ...prev]);
      toast.success("File terupload");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan jaringan");
    } finally {
      setUploading(false);
    }
  }

  async function onDownload(id: string) {
    try {
      const res = await fetch(`/api/knowledge/${id}`);
      const json = await safeJson(res);
      if (!res.ok) {
        toast.error(json.error?.message ?? "Gagal mengunduh");
        return;
      }
      const data = json.data as { signedUrl?: string } | undefined;
      if (!data?.signedUrl) {
        toast.error("URL unduhan tidak tersedia");
        return;
      }
      window.open(data.signedUrl, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan jaringan");
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Hapus file ini?")) return;
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      const json = await safeJson(res);
      if (!res.ok) {
        toast.error(json.error?.message ?? "Gagal hapus");
        return;
      }
      setFiles((prev) => prev.filter((f) => f.id !== id));
      toast.success("Dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan jaringan");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari judul atau tag…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-64 pl-8"
          />
        </div>
        <Select value={folder} onValueChange={(v) => v && setFolder(v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua folder</SelectItem>
            {KNOWLEDGE_FOLDERS.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button onClick={() => setOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload File
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            files.length === 0
              ? "Repositori masih kosong"
              : "Tidak ada file yang cocok"
          }
          description={
            files.length === 0
              ? "Upload proposal, SK, laporan, atau dokumen tim lain agar mudah diakses semua orang."
              : "Ubah kata kunci pencarian atau pilih folder lain."
          }
          action={
            files.length === 0 && (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Upload File Pertama
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((f) => {
          const canDelete = isKetua || f.uploadedById === currentUserId;
          return (
            <Card key={f.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{f.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-xs">
                        <Folder className="mr-1 h-3 w-3" />
                        {f.folder}
                      </Badge>
                      {f.version > 1 && (
                        <Badge variant="outline" className="text-xs">
                          v{f.version}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {f.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {f.description}
                  </p>
                )}
                {f.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {f.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        #{t}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {f.uploadedBy.name} · {formatBytes(f.fileSize)}
                  </span>
                  <span>{formatDateTime(f.createdAt)}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => onDownload(f.id)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Buka
                  </Button>
                  {canDelete && (
                    <Button size="sm" variant="ghost" onClick={() => onDelete(f.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload File ke Repositori</DialogTitle>
            <DialogDescription>
              Maksimal 25 MB. Kalau judul + folder sama dengan file lama, versi
              otomatis bertambah — riwayat tidak hilang.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onUpload} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Judul <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                autoFocus
                required
                placeholder="Proposal Kegiatan Pembukaan"
                disabled={uploading}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Deskripsi (opsional)</Label>
              <textarea
                id="description"
                name="description"
                rows={2}
                placeholder="Deskripsi singkat isi file, biar tim tahu tanpa perlu buka."
                disabled={uploading}
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="folder">Folder</Label>
                <select
                  id="folder"
                  name="folder"
                  defaultValue="Umum"
                  disabled={uploading}
                  className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {KNOWLEDGE_FOLDERS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tags">Tags (opsional)</Label>
                <Input
                  id="tags"
                  name="tags"
                  placeholder="proposal, draft, 2026"
                  disabled={uploading}
                  className="h-10"
                />
                <p className="text-[11px] text-muted-foreground">
                  Pisahkan dengan koma. Membantu pencarian.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="file">
                File <span className="text-destructive">*</span>
              </Label>
              <Input
                id="file"
                name="file"
                type="file"
                required
                disabled={uploading}
                className="h-10 cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
              />
              <p className="text-[11px] text-muted-foreground">
                Format bebas. Maksimal 25 MB.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={uploading}
                onClick={() => setOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload File
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
