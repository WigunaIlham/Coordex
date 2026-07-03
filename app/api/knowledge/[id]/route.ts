import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { db } from "@/lib/db";
import { createSignedUrl, deleteFromBucket } from "@/lib/supabase";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const file = await db.knowledgeFile.findUnique({
    where: { id },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });
  if (!file) return apiErr("File tidak ditemukan", 404);

  const signed = await createSignedUrl(STORAGE_BUCKETS.KNOWLEDGE_FILES, file.fileUrl, 3600);
  return apiOk({ ...file, signedUrl: signed });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const file = await db.knowledgeFile.findUnique({ where: { id } });
  if (!file) return apiErr("File tidak ditemukan", 404);

  const isOwner = file.uploadedById === session.user.id;
  const isKetua = isAdminOrKetua(session.user.role);
  if (!isOwner && !isKetua) return apiErr("Forbidden", 403);

  await db.knowledgeFile.delete({ where: { id } });
  try {
    await deleteFromBucket(STORAGE_BUCKETS.KNOWLEDGE_FILES, file.fileUrl);
  } catch {}
  return apiOk({ ok: true });
}
