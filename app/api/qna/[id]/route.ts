import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminOrKetua } from "@/lib/permissions";
import { updateQuestionSchema } from "@/lib/validators/qna";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  const { id } = await params;
  const q = await db.qnaQuestion.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, role: true } },
      answers: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true, role: true } },
        },
      },
    },
  });
  if (!q) return apiErr("Pertanyaan tidak ditemukan", 404);
  return apiOk(q);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  const { id } = await params;

  const existing = await db.qnaQuestion.findUnique({
    where: { id },
    select: { authorId: true },
  });
  if (!existing) return apiErr("Pertanyaan tidak ditemukan", 404);

  const canEdit =
    existing.authorId === session.user.id || isAdminOrKetua(session.user.role);
  if (!canEdit) return apiErr("Tidak diizinkan", 403);

  const body = await req.json().catch(() => null);
  const parsed = updateQuestionSchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  const updated = await db.qnaQuestion.update({
    where: { id },
    data: parsed.data,
  });
  return apiOk(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  const { id } = await params;

  const existing = await db.qnaQuestion.findUnique({
    where: { id },
    select: { authorId: true },
  });
  if (!existing) return apiErr("Pertanyaan tidak ditemukan", 404);

  const canDelete =
    existing.authorId === session.user.id || isAdminOrKetua(session.user.role);
  if (!canDelete) return apiErr("Tidak diizinkan", 403);

  await db.qnaQuestion.delete({ where: { id } });
  return apiOk({ ok: true });
}
