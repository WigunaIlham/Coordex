import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { AchievementClient } from "./achievement-client";

export default async function PencapaianPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!hasPermission(session.user.role, "pencapaian.crud")) redirect("/dashboard");

  const [achievements, targets] = await Promise.all([
    db.achievement.findMany({
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    }),
    db.achievementTarget.findMany({ orderBy: { type: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Target & Pencapaian Publikasi"
        description="Catat artikel, video, dan berita liputan. Track vs target tim."
      />
      <AchievementClient
        initialAchievements={achievements.map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          url: a.url,
          publishedDate: a.publishedDate?.toISOString() ?? null,
          author: a.author,
          createdAt: a.createdAt.toISOString(),
        }))}
        initialTargets={targets.map((t) => ({
          type: t.type,
          targetCount: t.targetCount,
          description: t.description,
        }))}
      />
    </div>
  );
}
