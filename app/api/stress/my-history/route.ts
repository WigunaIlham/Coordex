import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeStressIndex, getStressBand } from "@/lib/services/stress.service";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const responses = await db.stressResponse.findMany({
    where: { userId: session.user.id },
    include: { survey: { select: { weekNumber: true, surveyDate: true } } },
    orderBy: { survey: { weekNumber: "asc" } },
  });

  const items = responses.map((r) => {
    const index = computeStressIndex(r);
    return {
      weekNumber: r.survey.weekNumber,
      surveyDate: r.survey.surveyDate,
      submittedAt: r.submittedAt,
      index,
      band: getStressBand(index),
      scores: {
        fatigueScore: r.fatigueScore,
        motivationScore: r.motivationScore,
        sleepScore: r.sleepScore,
        conflictPerception: r.conflictPerception,
        stressLevel: r.stressLevel,
      },
    };
  });

  return apiOk(items);
}
