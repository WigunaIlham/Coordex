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
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={pickFile}
        disabled={busy !== null}
        aria-label="Ubah foto profil"
        className="group relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed"
      >
        <Avatar className="h-16 w-16 border-4 border-background shadow-sm sm:h-20 sm:w-20">
          <AvatarImage src={preview ?? undefined} alt={name} />
          <AvatarFallback className="text-lg font-medium">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {busy === "upload" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </span>
      </button>

      {preview && (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={handleDelete}
          disabled={busy !== null}
          aria-label="Hapus foto profil"
          className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full border shadow-sm"
        >
          {busy === "delete" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}
