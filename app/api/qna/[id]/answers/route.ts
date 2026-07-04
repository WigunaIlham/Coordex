import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAnswerSchema } from "@/lib/validators/qna";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  const { id } = await params;

  const question = await db.qnaQuestion.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!question) return apiErr("Pertanyaan tidak ditemukan", 404);

  const body = await req.json().catch(() => null);
  const parsed = createAnswerSchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  const answer = await db.qnaAnswer.create({
    data: {
      questionId: id,
      body: parsed.data.body,
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });
  return apiOk(answer, undefined, { status: 201 });
}
