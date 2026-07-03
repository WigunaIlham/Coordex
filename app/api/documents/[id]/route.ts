import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const doc = await db.generatedDocument.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
    },
  });
  if (!doc) return apiErr("Dokumen tidak ditemukan", 404);
  return apiOk(doc);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const doc = await db.generatedDocument.findUnique({ where: { id } });
  if (!doc) return apiErr("Dokumen tidak ditemukan", 404);

  const isOwner = doc.createdById === session.user.id;
  const isKetua = isAdminOrKetua(session.user.role);
  if (!isOwner && !isKetua) {
    return apiErr("Forbidden", 403);
  }

  await db.generatedDocument.delete({ where: { id } });
  return apiOk({ ok: true });
}
