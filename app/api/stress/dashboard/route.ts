import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  computeStressIndex,
  computeTeamStressIndex,
  getStressBand,
} from "@/lib/services/stress.service";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role)) {
    return apiErr("Hanya Ketua yang dapat melihat dashboard ini", 403);
  }

  const surveys = await db.stressSurvey.findMany({
    orderBy: { weekNumber: "desc" },
    take: 4,
    include: {
      responses: {
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      },
    },
  });
  if (surveys.length === 0) {
    return apiOk({
      currentWeek: null,
      trend: [],
    });
  }

  const activeMembersCount = await db.user.count({ where: { isActive: true } });

  const trend = [...surveys]
    .reverse()
    .map((s) => ({
      weekNumber: s.weekNumber,
      avgStressIndex: computeTeamStressIndex(s.responses),
      responseCount: s.responses.length,
    }));

  const current = surveys[0];
  const perMember = current.responses.map((r) => {
    const index = computeStressIndex(r);
    return {
      userId: r.user.id,
      name: r.user.name,
      role: r.user.role,
      index,
      band: getStressBand(index),
      notes: r.notes,
    };
  });
  perMember.sort((a, b) => b.index - a.index);

  return apiOk({
    currentWeek: {
      surveyId: current.id,
      weekNumber: current.weekNumber,
      surveyDate: current.surveyDate,
      avgStressIndex: computeTeamStressIndex(current.responses),
      responseRate:
        activeMembersCount === 0
          ? 0
          : Number(((current.responses.length / activeMembersCount) * 100).toFixed(1)),
      responseCount: current.responses.length,
      expectedCount: activeMembersCount,
      perMember,
    },
    trend,
  });
}
