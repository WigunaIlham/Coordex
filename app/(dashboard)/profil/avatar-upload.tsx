"use client";

import { Camera, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UPLOAD_LIMITS } from "@/lib/constants";
import { getInitials } from "@/lib/utils";

type Props = {
  name: string;
  avatarUrl: string | null;
};

const ACCEPT = UPLOAD_LIMITS.AVATAR_TYPES.join(",");

export function AvatarUpload({ name, avatarUrl }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);

  function pickFile() {
    if (busy) return;
    inputRef.current?.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!UPLOAD_LIMITS.AVATAR_TYPES.includes(file.type as (typeof UPLOAD_LIMITS.AVATAR_TYPES)[number])) {
      toast.error("Format harus JPG, PNG, atau WEBP");
      return;
    }
    if (file.size > UPLOAD_LIMITS.AVATAR_MAX_BYTES) {
      const mb = Math.round(UPLOAD_LIMITS.AVATAR_MAX_BYTES / (1024 * 1024));
      toast.error(`Ukuran melebihi ${mb} MB`);
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setBusy("upload");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/users/me/avatar", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error?.message ?? "Gagal mengunggah foto");
        setPreview(avatarUrl);
        return;
      }
      const newUrl = json.data?.avatarUrl ?? null;
      setPreview(newUrl);
      toast.success("Foto profil diperbarui");
      router.refresh();
    } catch {
      toast.error("Gagal mengunggah foto");
      setPreview(avatarUrl);
    } finally {
      URL.revokeObjectURL(localUrl);
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (busy || !preview) return;
    setBusy("delete");
    try {
      const res = await fetch("/api/users/me/avatar", { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error?.message ?? "Gagal menghapus foto");
        return;
      }
      setPreview(null);
      toast.success("Foto profil dihapus");
      router.refresh();
    } catch {
      toast.error("Gagal menghapus foto");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 sm:items-start">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleChange}
      />

      <div className="relative">
        <Avatar className="h-16 w-16 border-4 border-background shadow-sm sm:h-20 sm:w-20">
          <AvatarImage src={preview ?? undefined} alt={name} />
          <AvatarFallback className="text-lg font-medium">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>

        <button
          type="button"
          onClick={pickFile}
          disabled={busy !== null}
          aria-label="Ubah foto profil"
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-background bg-primary text-primary-foreground shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy === "upload" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <div className="flex items-center gap-2">
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
            <Camera className="mr-1.5 h-3.5 w-3.5" />
          )}
          {preview ? "Ganti Foto" : "Unggah Foto"}
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

      <p className="text-[10px] text-muted-foreground">JPG/PNG/WEBP, maks 2 MB</p>
    </div>
  );
}
