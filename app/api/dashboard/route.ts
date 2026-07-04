import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const userId = session.user.id;
  const isKetua = isAdminOrKetua(session.user.role);

  const [myTaskGroups, recentActivities, conflictCount, financeSummary] =
    await Promise.all([
      db.task.groupBy({
        by: ["status"],
        where: { assignees: { some: { userId } } },
        _count: { _all: true },
      }),
      db.activityUpdate.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true, role: true } },
        },
      }),
      isKetua
        ? db.conflictReport.count({ where: { status: { not: "SELESAI" } } })
        : Promise.resolve<number | null>(null),
      isKetua
        ? db.financialTransaction.groupBy({
            by: ["type"],
            _sum: { amount: true },
          })
        : Promise.resolve<{ type: "PEMASUKAN" | "PENGELUARAN"; _sum: { amount: unknown } }[]>([]),
    ]);

  const myTasks = {
    todo: myTaskGroups.find((g) => g.status === "TODO")?._count._all ?? 0,
    inProgress: myTaskGroups.find((g) => g.status === "IN_PROGRESS")?._count._all ?? 0,
    review: myTaskGroups.find((g) => g.status === "REVIEW")?._count._all ?? 0,
    done: myTaskGroups.find((g) => g.status === "DONE")?._count._all ?? 0,
  };

  let financeBalance: number | null = null;
  if (isKetua && Array.isArray(financeSummary)) {
    const pemasukan = Number(
      financeSummary.find((g) => g.type === "PEMASUKAN")?._sum.amount ?? 0
    );
    const pengeluaran = Number(
      financeSummary.find((g) => g.type === "PENGELUARAN")?._sum.amount ?? 0
    );
    financeBalance = pemasukan - pengeluaran;
  }

  return apiOk({
    myTasks,
    recentActivities,
    unresolvedConflicts: conflictCount,
    financeBalance,
  });
}
