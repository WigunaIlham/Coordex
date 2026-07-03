import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSurveySchema } from "@/lib/validators/stress";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const surveys = await db.stressSurvey.findMany({
    orderBy: { weekNumber: "desc" },
    include: { _count: { select: { responses: true } } },
  });
  return apiOk(surveys);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role)) {
    return apiErr("Hanya Ketua yang dapat membuat survei", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = createSurveySchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const exists = await db.stressSurvey.findUnique({
    where: { weekNumber: parsed.data.weekNumber },
  });
  if (exists) return apiErr("Survei untuk minggu ini sudah ada", 409);

  // Deactivate older active surveys
  await db.stressSurvey.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  const survey = await db.stressSurvey.create({
    data: {
      weekNumber: parsed.data.weekNumber,
      surveyDate: parsed.data.surveyDate,
      opensAt: parsed.data.opensAt,
      closesAt: parsed.data.closesAt,
      isActive: true,
      createdById: session.user.id,
    },
  });
  return apiOk(survey, undefined, { status: 201 });
}
