import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const now = new Date();

  // "Active" = flag isActive true AND now within [opensAt, closesAt].
  const active = await db.stressSurvey.findFirst({
    where: {
      isActive: true,
      opensAt: { lte: now },
      closesAt: { gte: now },
    },
    orderBy: { weekNumber: "desc" },
    include: {
      responses: {
        where: { userId: session.user.id },
        select: { id: true, submittedAt: true },
      },
    },
  });

  if (!active) return apiOk(null);

  return apiOk({
    id: active.id,
    weekNumber: active.weekNumber,
    surveyDate: active.surveyDate,
    opensAt: active.opensAt,
    closesAt: active.closesAt,
    isActive: active.isActive,
    hasResponded: active.responses.length > 0,
  });
}
