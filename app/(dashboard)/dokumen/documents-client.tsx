"use client";

import { Download, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn, formatDateTime } from "@/lib/utils";

type Field = {
  key: string;
  label: string;
  type: string;
  required: boolean;
};

type Template = {
  type: string;
  label: string;
  fields: readonly Field[];
};

type DocRow = {
  id: string;
  title: string;
  templateType: string;
  createdBy: { id: string; name: string };
  createdAt: string;
};

type Member = {
  id: string;
  name: string;
  studentId: string | null;
  role: string;
};

const TEMPLATE_LABELS: Record<string, string> = {
  SURAT_UNDANGAN: "Surat Undangan",
  NOTULEN_RAPAT: "Notulen Rapat",
  DAFTAR_HADIR: "Daftar Hadir",
  LPJ: "Laporan Pertanggungjawaban",
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

export function DocumentsClient({
  initialDocuments,
  templates,
  members,
  currentUserId,
}: {
  initialDocuments: DocRow[];
  templates: Template[];
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [docs, setDocs] = useState(initialDocuments);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DocRow | null>(null);

  async function onDelete(id: string) {
    setPendingDelete(id);
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    const json = await safeJson(res);
    setPendingDelete(null);
    setDeleteConfirm(null);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menghapus");
      return;
    }
    setDocs((prev) => prev.filter((d) => d.id !== id));
    toast.success("Dokumen dihapus");
    router.refresh();
  }

  function onCreated(created: DocRow) {
    setDocs((prev) => [created, ...prev]);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Buat Dokumen
        </Button>
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada dokumen"
          description="Pilih template — Surat Undangan, Notulen, Daftar Hadir, atau LPJ — dan otomatis ter-generate ke PDF & DOCX."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Mulai dari Template
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {docs.map((d) => {
            const canDelete = d.createdBy.id === currentUserId;
            const busyDelete = pendingDelete === d.id;
            return (
              <Card key={d.id} className="transition-colors hover:border-primary/40">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{d.title}</p>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {TEMPLATE_LABELS[d.templateType] ?? d.templateType}
                      </Badge>
                    </div>
                    {(canDelete || true) && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteConfirm(d)}
                        disabled={busyDelete}
                        aria-label="Hapus dokumen"
                      >
                        {busyDelete ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.createdBy.name} · {formatDateTime(d.createdAt)}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <a
                      href={`/api/documents/${d.id}/download?format=pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                    </a>
                    <a
                      href={`/api/documents/${d.id}/download?format=docx`}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> DOCX
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateDocumentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        templates={templates}
        members={members}
        onCreated={onCreated}
      />

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(v) => {
          if (!v) setDeleteConfirm(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus dokumen?</DialogTitle>
            <DialogDescription>
              {deleteConfirm && (
                <>
                  Dokumen <span className="font-medium">{deleteConfirm.title}</span>{" "}
                  akan dihapus permanen dari server. Tindakan ini tidak dapat
                  dibatalkan.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteConfirm(null)}
              disabled={pendingDelete === deleteConfirm?.id}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteConfirm && onDelete(deleteConfirm.id)}
              disabled={pendingDelete === deleteConfirm?.id}
            >
              {pendingDelete === deleteConfirm?.id && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Create dialog: template picker + dynamic fields (text, textarea, date,
 * number, `attendees` checklist).
 */
function CreateDocumentDialog({
  open,
  onOpenChange,
  templates,
  members,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templates: Template[];
  members: Member[];
  onCreated: (d: DocRow) => void;
}) {
  const [templateType, setTemplateType] = useState(templates[0]?.type ?? "");
  const [title, setTitle] = useState("");
  // formData is a heterogenous bag: strings for text/textarea/date/number,
  // string[] for attendees. We keep it typed loosely for form storage.
  const [formData, setFormData] = useState<Record<string, string | string[]>>({});
  const [creating, setCreating] = useState(false);

  const current = useMemo(
    () => templates.find((t) => t.type === templateType) ?? templates[0],
    [templates, templateType],
  );

  // Reset form when template changes or dialog opens.
  useEffect(() => {
    setFormData({});
    setTitle("");
  }, [templateType]);
  useEffect(() => {
    if (open) {
      setFormData({});
      setTitle("");
      setTemplateType(templates[0]?.type ?? "");
    }
  }, [open, templates]);

  function setField(k: string, v: string | string[]) {
    setFormData((prev) => ({ ...prev, [k]: v }));
  }

  function toggleAttendee(field: string, id: string) {
    setFormData((prev) => {
      const cur = Array.isArray(prev[field]) ? (prev[field] as string[]) : [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...prev, [field]: next };
    });
  }

  function selectAllAttendees(field: string, pool: Member[]) {
    setFormData((prev) => ({ ...prev, [field]: pool.map((m) => m.id) }));
  }
  function clearAttendees(field: string) {
    setFormData((prev) => ({ ...prev, [field]: [] }));
  }

  async function generateAndDownload(format: "pdf" | "docx") {
    if (!title.trim()) {
      toast.error("Isi judul dokumen dulu");
      return;
    }
    for (const f of current.fields) {
      if (!f.required) continue;
      const v = formData[f.key];
      const empty =
        v === undefined ||
        v === null ||
        (typeof v === "string" && v.trim() === "") ||
        (Array.isArray(v) && v.length === 0);
      if (empty) {
        toast.error(`Field "${f.label}" wajib diisi`);
        return;
      }
    }

    setCreating(true);
    const res = await fetch("/api/documents/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateType, title, formData }),
    });
    const json = await safeJson(res);
    setCreating(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal membuat dokumen");
      return;
    }
    const created = json.data as {
      id: string;
      templateType: string;
      title: string;
      createdAt: string;
    };
    // Open download in new tab, then close & refresh list.
    window.open(`/api/documents/${created.id}/download?format=${format}`, "_blank");
    toast.success("Dokumen tersimpan, mulai unduh…");
    onCreated({
      id: created.id,
      title: created.title,
      templateType: created.templateType,
      createdBy: { id: "", name: "Anda" }, // temporary; refreshed by router.refresh()
      createdAt: created.createdAt,
    });
    onOpenChange(false);
  }

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buat Dokumen Baru</DialogTitle>
          <DialogDescription>
            Pilih template, isi data, lalu unduh dalam format PDF atau DOCX.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Template picker */}
          <div className="space-y-1.5">
            <Label>
              Template <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {templates.map((t) => {
                const active = t.type === templateType;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setTemplateType(t.type)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Judul */}
          <div className="space-y-1.5">
            <Label htmlFor="doc-title">
              Judul Dokumen (untuk arsip) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={current.label}
              className="h-10"
              disabled={creating}
            />
            <p className="text-[11px] text-muted-foreground">
              Ini hanya nama arsip — tidak muncul di isi dokumen.
            </p>
          </div>

          {/* Dynamic fields */}
          <div className="grid gap-3 sm:grid-cols-2">
            {current.fields.map((f) => {
              const val = formData[f.key];
              const isFull = f.type === "textarea" || f.type === "attendees";
              return (
                <div
                  key={f.key}
                  className={cn("space-y-1.5", isFull && "sm:col-span-2")}
                >
                  <Label htmlFor={`f-${f.key}`}>
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </Label>
                  {f.type === "textarea" ? (
                    <textarea
                      id={`f-${f.key}`}
                      rows={3}
                      value={typeof val === "string" ? val : ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      disabled={creating}
                      className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  ) : f.type === "attendees" ? (
                    <AttendeesPicker
                      field={f.key}
                      selected={Array.isArray(val) ? val : []}
                      members={
                        // Daftar hadir hanya untuk anggota lapangan — admin
                        // (SUPER_ADMIN) tidak ikut absensi kegiatan.
                        templateType === "DAFTAR_HADIR"
                          ? members.filter((m) => m.role !== "SUPER_ADMIN")
                          : members
                      }
                      onToggle={(id) => toggleAttendee(f.key, id)}
                      onSelectAll={() =>
                        selectAllAttendees(
                          f.key,
                          templateType === "DAFTAR_HADIR"
                            ? members.filter((m) => m.role !== "SUPER_ADMIN")
                            : members,
                        )
                      }
                      onClear={() => clearAttendees(f.key)}
                      disabled={creating}
                    />
                  ) : (
                    <Input
                      id={`f-${f.key}`}
                      type={
                        f.type === "date"
                          ? "date"
                          : f.type === "number"
                            ? "number"
                            : "text"
                      }
                      value={typeof val === "string" ? val : ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      disabled={creating}
                      className="h-10"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => generateAndDownload("docx")}
            disabled={creating}
          >
            <Download className="mr-2 h-4 w-4" /> Generate DOCX
          </Button>
          <Button
            type="button"
            onClick={() => generateAndDownload("pdf")}
            disabled={creating}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Download className="mr-2 h-4 w-4" /> Generate PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttendeesPicker({
  field,
  selected,
  members,
  onToggle,
  onSelectAll,
  onClear,
  disabled,
}: {
  field: string;
  selected: string[];
  members: Member[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          {selected.length} / {members.length} dipilih
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onSelectAll}
          disabled={disabled}
        >
          Pilih semua
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onClear}
          disabled={disabled}
        >
          Kosongkan
        </Button>
      </div>
      <div
        role="group"
        aria-label={field}
        className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2"
      >
        {members.length === 0 ? (
          <p className="col-span-full py-4 text-center text-xs text-muted-foreground">
            Belum ada anggota aktif.
          </p>
        ) : (
          members.map((m) => {
            const checked = selected.includes(m.id);
            return (
              <label
                key={m.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs transition-colors",
                  checked
                    ? "border-primary/40 bg-primary/5"
                    : "border-transparent hover:bg-muted",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(m.id)}
                  disabled={disabled}
                  aria-label={m.name}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.name}</p>
                  {m.studentId && (
                    <p className="text-[10px] text-muted-foreground">
                      NIM {m.studentId}
                    </p>
                  )}
                </div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
