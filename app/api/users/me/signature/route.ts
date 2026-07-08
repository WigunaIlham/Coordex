import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { STORAGE_BUCKETS, UPLOAD_LIMITS } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  buildFilePath,
  deleteFromBucket,
  ensurePublicBucket,
  getPublicUrl,
  uploadToBucket,
} from "@/lib/supabase";

export const runtime = "nodejs";

function extractPath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/${STORAGE_BUCKETS.SIGNATURES}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length).split("?")[0];
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiErr("Unauthorized", 401);

    const form = await req.formData().catch(() => null);
    if (!form) return apiErr("Body form-data tidak valid", 400);

    const file = form.get("file");
    if (!(file instanceof File)) return apiErr("File wajib diupload", 400);

    if (
      !UPLOAD_LIMITS.SIGNATURE_TYPES.includes(
        file.type as (typeof UPLOAD_LIMITS.SIGNATURE_TYPES)[number],
      )
    ) {
      return apiErr("Format harus PNG, JPG, atau WEBP", 400);
    }
    if (file.size > UPLOAD_LIMITS.SIGNATURE_MAX_BYTES) {
      return apiErr(
        `Ukuran melebihi ${Math.round(
          UPLOAD_LIMITS.SIGNATURE_MAX_BYTES / (1024 * 1024),
        )} MB`,
        400,
      );
    }

    const current = await db.user.findUnique({
      where: { id: session.user.id },
      select: { signatureUrl: true },
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = buildFilePath(`user-${session.user.id}`, file.name);

    try {
      await ensurePublicBucket(STORAGE_BUCKETS.SIGNATURES);
      await uploadToBucket(STORAGE_BUCKETS.SIGNATURES, path, buffer, file.type);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal upload ke storage";
      return apiErr(msg, 500, "STORAGE_UPLOAD_FAILED");
    }

    const publicUrl = `${getPublicUrl(
      STORAGE_BUCKETS.SIGNATURES,
      path,
    )}?v=${Date.now()}`;

    const updated = await db.user.update({
      where: { id: session.user.id },
      data: { signatureUrl: publicUrl },
      select: { signatureUrl: true },
    });

    const oldPath = extractPath(current?.signatureUrl ?? null);
    if (oldPath && oldPath !== path) {
      try {
        await deleteFromBucket(STORAGE_BUCKETS.SIGNATURES, oldPath);
      } catch {
        // best-effort
      }
    }

    return apiOk(updated);
  } catch (err) {
    console.error("[api/users/me/signature POST]", err);
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
    return apiErr(msg, 500, "INTERNAL_ERROR");
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const current = await db.user.findUnique({
    where: { id: session.user.id },
    select: { signatureUrl: true },
  });

  const oldPath = extractPath(current?.signatureUrl ?? null);
  if (oldPath) {
    try {
      await deleteFromBucket(STORAGE_BUCKETS.SIGNATURES, oldPath);
    } catch {
      // best-effort
    }
  }

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: { signatureUrl: null },
    select: { signatureUrl: true },
  });

  return apiOk(updated);
}
