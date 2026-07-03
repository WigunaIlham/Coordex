import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { STORAGE_BUCKETS, UPLOAD_LIMITS } from "@/lib/constants";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { buildFilePath, uploadToBucket } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const items = await db.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });
  return apiOk(items);
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiErr("Unauthorized", 401);
    if (!hasPermission(session.user.role, "media.crud")) {
      return apiErr("Tidak diizinkan", 403);
    }

    const form = await req.formData().catch(() => null);
    if (!form) return apiErr("Body form-data tidak valid", 400);

    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const caption = String(form.get("caption") ?? "").trim();
    const event = String(form.get("event") ?? "").trim();
    const type = String(form.get("type") ?? "FOTO").trim().toUpperCase();

    if (!(file instanceof File)) return apiErr("File wajib diupload", 400);
    if (!title) return apiErr("Judul wajib", 400);
    if (type !== "FOTO" && type !== "VIDEO") {
      return apiErr("Tipe media tidak valid", 400);
    }

    const maxBytes =
      type === "VIDEO" ? 100 * 1024 * 1024 : UPLOAD_LIMITS.KNOWLEDGE_MAX_BYTES;
    if (file.size > maxBytes) {
      return apiErr(
        `Ukuran melebihi ${Math.round(maxBytes / (1024 * 1024))} MB`,
        400,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = buildFilePath(`media/${type.toLowerCase()}`, file.name);
    try {
      await uploadToBucket(STORAGE_BUCKETS.MEDIA_ASSETS, path, buffer, file.type);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal upload ke storage";
      return apiErr(msg, 500, "STORAGE_UPLOAD_FAILED");
    }

    const created = await db.mediaAsset.create({
      data: {
        type: type as "FOTO" | "VIDEO",
        title,
        caption: caption || null,
        event: event || null,
        fileUrl: path,
        thumbnailUrl: null,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    return apiOk(created, undefined, { status: 201 });
  } catch (err) {
    console.error("[api/media POST]", err);
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
    return apiErr(msg, 500, "INTERNAL_ERROR");
  }
}
