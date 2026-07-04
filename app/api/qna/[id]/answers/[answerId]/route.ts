import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; answerId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  const { answerId } = await params;

  const existing = await db.qnaAnswer.findUnique({
    where: { id: answerId },
    select: { authorId: true },
  });
  if (!existing) return apiErr("Jawaban tidak ditemukan", 404);

  const canDelete =
    existing.authorId === session.user.id || isAdminOrKetua(session.user.role);
  if (!canDelete) return apiErr("Tidak diizinkan", 403);

  await db.qnaAnswer.delete({ where: { id: answerId } });
  return apiOk({ ok: true });
}
