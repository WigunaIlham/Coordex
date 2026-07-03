import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ACTIVE_TASK_STATUSES,
  computeWorkload,
} from "@/lib/services/workload.service";
import { WorkloadClient } from "./workload-client";
import { isAdminOrKetua } from "@/lib/permissions";

export default async function BebanKerjaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const users = await db.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
      assignedTasks: {
        select: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              points: true,
              dueDate: true,
            },
          },
        },
      },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const data = users.map((u) => {
    const tasks = u.assignedTasks.map((a) => a.task);
    const wl = computeWorkload(tasks);
    const active = tasks
      .filter((t) => ACTIVE_TASK_STATUSES.includes(t.status))
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        points: t.points,
        dueDate: t.dueDate?.toISOString() ?? null,
      }));
    return {
      userId: u.id,
      name: u.name,
      role: u.role,
      avatarUrl: u.avatarUrl,
      ...wl,
      activeTasks: active,
    };
  });

  return (
    <div>
      <PageHeader
        title="Beban Kerja Tim"
        description="Kalkulasi otomatis dari tugas aktif setiap anggota."
      />
      <WorkloadClient initialData={data} canSeeAll={isAdminOrKetua(session.user.role)} />
    </div>
  );
}
