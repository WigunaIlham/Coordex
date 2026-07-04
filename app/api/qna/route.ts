import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createQuestionSchema } from "@/lib/validators/qna";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const questions = await db.qnaQuestion.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, role: true } },
      _count: { select: { answers: true } },
    },
  });
  return apiOk(questions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const question = await db.qnaQuestion.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body ?? null,
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, role: true } },
      _count: { select: { answers: true } },
    },
  });
  return apiOk(question, undefined, { status: 201 });
}
