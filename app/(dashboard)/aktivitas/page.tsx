import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActivitiesClient } from "./activities-client";

export default async function AktivitasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [activities, members] = await Promise.all([
    db.activityUpdate.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Aktivitas Tim"
        description="Timeline update dari seluruh anggota tim."
      />
      <ActivitiesClient
        initialActivities={activities.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
        }))}
        members={members}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
      />
    </div>
  );
}
