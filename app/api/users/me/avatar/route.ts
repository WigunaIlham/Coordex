import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { STORAGE_BUCKETS, UPLOAD_LIMITS } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  buildFilePath,
  deleteFromBucket,
  getPublicUrl,
  uploadToBucket,
} from "@/lib/supabase";

export const runtime = "nodejs";

function extractAvatarPath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/${STORAGE_BUCKETS.AVATARS}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiErr("Unauthorized", 401);

    const form = await req.formData().catch(() => null);
    if (!form) return apiErr("Body form-data tidak valid", 400);

    const file = form.get("file");
    if (!(file instanceof File)) return apiErr("File wajib diupload", 400);

    if (!UPLOAD_LIMITS.AVATAR_TYPES.includes(file.type as (typeof UPLOAD_LIMITS.AVATAR_TYPES)[number])) {
      return apiErr("Format harus JPG, PNG, atau WEBP", 400);
    }
    if (file.size > UPLOAD_LIMITS.AVATAR_MAX_BYTES) {
      return apiErr(
        `Ukuran melebihi ${Math.round(UPLOAD_LIMITS.AVATAR_MAX_BYTES / (1024 * 1024))} MB`,
        400,
      );
    }

    const current = await db.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = buildFilePath(`user-${session.user.id}`, file.name);

    try {
      await uploadToBucket(STORAGE_BUCKETS.AVATARS, path, buffer, file.type);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal upload ke storage";
      return apiErr(msg, 500, "STORAGE_UPLOAD_FAILED");
    }

    const publicUrl = getPublicUrl(STORAGE_BUCKETS.AVATARS, path);

    const updated = await db.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: publicUrl },
      select: { avatarUrl: true },
    });

    const oldPath = extractAvatarPath(current?.avatarUrl ?? null);
    if (oldPath && oldPath !== path) {
      try {
        await deleteFromBucket(STORAGE_BUCKETS.AVATARS, oldPath);
      } catch {
        // best-effort; abaikan kalau gagal
      }
    }

    return apiOk(updated);
  } catch (err) {
    console.error("[api/users/me/avatar POST]", err);
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
    return apiErr(msg, 500, "INTERNAL_ERROR");
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const current = await db.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });

  const oldPath = extractAvatarPath(current?.avatarUrl ?? null);
  if (oldPath) {
    try {
      await deleteFromBucket(STORAGE_BUCKETS.AVATARS, oldPath);
    } catch {
      // best-effort
    }
  }

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: null },
    select: { avatarUrl: true },
  });

  return apiOk(updated);
}
