import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  computeStressIndex,
  computeTeamStressIndex,
  getStressBand,
} from "@/lib/services/stress.service";
import { StressPageClient } from "./stress-client";
import { isAdminOrKetua } from "@/lib/permissions";

export default async function StresPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isKetua = isAdminOrKetua(session.user.role);

  const now = new Date();
  const [activeSurvey, myHistory, dashboard, activeMembersCount] = await Promise.all([
    db.stressSurvey.findFirst({
      where: {
        isActive: true,
        opensAt: { lte: now },
        closesAt: { gte: now },
      },
      orderBy: { weekNumber: "desc" },
      include: {
        responses: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    }),
    db.stressResponse.findMany({
      where: { userId: session.user.id },
      orderBy: { survey: { weekNumber: "asc" } },
      include: { survey: { select: { weekNumber: true } } },
    }),
    isKetua
      ? db.stressSurvey.findMany({
          orderBy: { weekNumber: "desc" },
          take: 4,
          include: {
            responses: {
              include: { user: { select: { id: true, name: true, role: true } } },
            },
          },
        })
      : Promise.resolve<never[]>([]),
    db.user.count({ where: { isActive: true } }),
  ]);

  const myHistoryData = myHistory.map((r) => {
    const index = computeStressIndex(r);
    return {
      weekNumber: r.survey.weekNumber,
      index,
      band: getStressBand(index),
    };
  });

  let ketuaDashboard: {
    currentWeek: null | {
      surveyId: string;
      weekNumber: number;
      avgStressIndex: number;
      responseCount: number;
      expectedCount: number;
      responseRate: number;
      perMember: { userId: string; name: string; role: string; index: number; band: string }[];
    };
    trend: { weekNumber: number; avgStressIndex: number; responseCount: number }[];
  } | null = null;

  if (isKetua) {
    if (dashboard.length === 0) {
      ketuaDashboard = { currentWeek: null, trend: [] };
    } else {
      const current = dashboard[0];
      const perMember = current.responses
        .map((r) => {
          const idx = computeStressIndex(r);
          return {
            userId: r.user.id,
            name: r.user.name,
            role: r.user.role,
            index: idx,
            band: getStressBand(idx),
          };
        })
        .sort((a, b) => b.index - a.index);

      const trend = [...dashboard]
        .reverse()
        .map((s) => ({
          weekNumber: s.weekNumber,
          avgStressIndex: computeTeamStressIndex(s.responses),
          responseCount: s.responses.length,
        }));

      ketuaDashboard = {
        currentWeek: {
          surveyId: current.id,
          weekNumber: current.weekNumber,
          avgStressIndex: computeTeamStressIndex(current.responses),
          responseCount: current.responses.length,
          expectedCount: activeMembersCount,
          responseRate:
            activeMembersCount === 0
              ? 0
              : Number(((current.responses.length / activeMembersCount) * 100).toFixed(1)),
          perMember,
        },
        trend,
      };
    }
  }

  const activeSurveyForUser = activeSurvey
    ? {
        id: activeSurvey.id,
        weekNumber: activeSurvey.weekNumber,
        hasResponded: activeSurvey.responses.length > 0,
        opensAt: activeSurvey.opensAt.toISOString(),
        closesAt: activeSurvey.closesAt.toISOString(),
      }
    : null;

  return (
    <div>
      <PageHeader
        title="Survei & Wellbeing"
        description="Pantau wellbeing tim setiap minggu."
      />
      <StressPageClient
        isKetua={isKetua}
        activeSurvey={activeSurveyForUser}
        myHistory={myHistoryData}
        ketuaDashboard={ketuaDashboard}
      />
    </div>
  );
}
