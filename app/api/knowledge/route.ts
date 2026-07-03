import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { STORAGE_BUCKETS, UPLOAD_LIMITS } from "@/lib/constants";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { buildFilePath, uploadToBucket } from "@/lib/supabase";
import { KNOWLEDGE_FOLDERS } from "@/lib/validators/knowledge";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const url = new URL(req.url);
  const folder = url.searchParams.get("folder");
  const q = url.searchParams.get("q");

  const where: Prisma.KnowledgeFileWhereInput = {};
  if (folder && (KNOWLEDGE_FOLDERS as readonly string[]).includes(folder)) {
    where.folder = folder;
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { tags: { has: q } },
    ];
  }

  const items = await db.knowledgeFile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
  });
  return apiOk(items);
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiErr("Unauthorized", 401);

    const form = await req.formData().catch(() => null);
    if (!form) return apiErr("Body form-data tidak valid", 400);

    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const folder = String(form.get("folder") ?? "Umum");
    const tagsRaw = String(form.get("tags") ?? "");
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    if (!(file instanceof File)) return apiErr("File wajib diupload", 400);
    if (!title) return apiErr("Judul wajib", 400);
    if (file.size > UPLOAD_LIMITS.KNOWLEDGE_MAX_BYTES) {
      return apiErr("Ukuran file melebihi 25 MB", 400);
    }
    if (!(KNOWLEDGE_FOLDERS as readonly string[]).includes(folder)) {
      return apiErr("Folder tidak valid", 400);
    }

    // Versioning: if file with same title in same folder exists → bump version
    const existing = await db.knowledgeFile.findFirst({
      where: { title, folder },
      orderBy: { version: "desc" },
    });
    const nextVersion = existing ? existing.version + 1 : 1;

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = buildFilePath(`knowledge/${folder.toLowerCase()}`, file.name);
    try {
      await uploadToBucket(STORAGE_BUCKETS.KNOWLEDGE_FILES, path, buffer, file.type);
    } catch (uploadErr) {
      const msg =
        uploadErr instanceof Error ? uploadErr.message : "Gagal upload ke storage";
      return apiErr(msg, 500, "STORAGE_UPLOAD_FAILED");
    }

    const created = await db.knowledgeFile.create({
      data: {
        title,
        description: description || null,
        folder,
        tags,
        fileUrl: path,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        version: nextVersion,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    return apiOk(created, undefined, { status: 201 });
  } catch (err) {
    console.error("[api/knowledge POST]", err);
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return apiErr(msg, 500, "INTERNAL_ERROR");
  }
}
