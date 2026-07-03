import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { submitResponseSchema } from "@/lib/validators/stress";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const survey = await db.stressSurvey.findUnique({ where: { id } });
  if (!survey) return apiErr("Survei tidak ditemukan", 404);
  if (!survey.isActive) return apiErr("Survei sudah tidak aktif", 400);

  const now = new Date();
  if (now < survey.opensAt) {
    return apiErr(
      `Survei baru dibuka pada ${survey.opensAt.toLocaleString("id-ID")}`,
      400,
    );
  }
  if (now > survey.closesAt) {
    return apiErr(
      `Survei sudah ditutup pada ${survey.closesAt.toLocaleString("id-ID")}`,
      400,
    );
  }

  const existing = await db.stressResponse.findUnique({
    where: { surveyId_userId: { surveyId: id, userId: session.user.id } },
  });
  if (existing) return apiErr("Anda sudah mengisi survei minggu ini", 409);

  const body = await req.json().catch(() => null);
  const parsed = submitResponseSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const response = await db.stressResponse.create({
    data: {
      surveyId: id,
      userId: session.user.id,
      ...parsed.data,
    },
    select: { id: true, submittedAt: true },
  });
  return apiOk(response, undefined, { status: 201 });
}
