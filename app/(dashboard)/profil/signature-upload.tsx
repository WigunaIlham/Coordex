"use client";

import { Loader2, PenLine, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { UPLOAD_LIMITS } from "@/lib/constants";

type Props = {
  signatureUrl: string | null;
};

const ACCEPT = UPLOAD_LIMITS.SIGNATURE_TYPES.join(",");

export function SignatureUpload({ signatureUrl }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(signatureUrl);
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);

  function pickFile() {
    if (busy) return;
    inputRef.current?.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (
      !UPLOAD_LIMITS.SIGNATURE_TYPES.includes(
        file.type as (typeof UPLOAD_LIMITS.SIGNATURE_TYPES)[number],
      )
    ) {
      toast.error("Format harus PNG, JPG, atau WEBP");
      return;
    }
    if (file.size > UPLOAD_LIMITS.SIGNATURE_MAX_BYTES) {
      const mb = Math.round(UPLOAD_LIMITS.SIGNATURE_MAX_BYTES / (1024 * 1024));
      toast.error(`Ukuran melebihi ${mb} MB`);
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setBusy("upload");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/users/me/signature", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error?.message ?? "Gagal mengunggah tanda tangan");
        setPreview(signatureUrl);
        return;
      }
      const newUrl = json.data?.signatureUrl ?? null;
      setPreview(newUrl);
      toast.success("Tanda tangan diperbarui");
      router.refresh();
    } catch {
      toast.error("Gagal mengunggah tanda tangan");
      setPreview(signatureUrl);
    } finally {
      URL.revokeObjectURL(localUrl);
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (busy || !preview) return;
    setBusy("delete");
    try {
      const res = await fetch("/api/users/me/signature", { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error?.message ?? "Gagal menghapus tanda tangan");
        return;
      }
      setPreview(null);
      toast.success("Tanda tangan dihapus");
      router.refresh();
    } catch {
      toast.error("Gagal menghapus tanda tangan");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleChange}
      />

      <div
        className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/30"
        // Background kotak-kotak halus supaya area transparan gambar TTD ketara.
        style={{
          backgroundImage:
            "linear-gradient(45deg, rgba(0,0,0,0.04) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,0.04) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.04) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.04) 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Tanda tangan"
            className="max-h-28 max-w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <PenLine className="h-6 w-6" />
            <p className="text-xs">Belum ada tanda tangan</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={pickFile}
          disabled={busy !== null}
          className="h-8"
        >
          {busy === "upload" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-3.5 w-3.5" />
          )}
          {preview ? "Ganti Tanda Tangan" : "Unggah Tanda Tangan"}
        </Button>
        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={busy !== null}
            className="h-8 text-destructive hover:text-destructive"
          >
            {busy === "delete" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Hapus
          </Button>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Tips: gunakan PNG dengan latar <span className="font-medium">transparan</span>{" "}
        agar TTD menyatu rapi di dokumen (mis. daftar hadir). Maks 1 MB.
      </p>
    </div>
  );
}
