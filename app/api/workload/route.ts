import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVE_TASK_STATUSES, computeWorkload } from "@/lib/services/workload.service";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

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
    const activeTasks = tasks.filter((t) => ACTIVE_TASK_STATUSES.includes(t.status));
    return {
      userId: u.id,
      name: u.name,
      role: u.role,
      avatarUrl: u.avatarUrl,
      weightedPoints: wl.weightedPoints,
      utilizationPercent: wl.utilizationPercent,
      status: wl.status,
      activeTaskCount: activeTasks.length,
      activeTasks,
    };
  });

  return apiOk(data, { total: data.length });
}
