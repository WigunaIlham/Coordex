import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";

/**
 * Dashboard aggregates that DON'T depend on the current user. Cached for 10s so
 * repeat page loads by different team members reuse the same result — the
 * dashboard is refreshed for the whole team roughly every 10 seconds.
 *
 * User-specific queries (my active tasks, my survey response) stay uncached in
 * the page component. See app/(dashboard)/dashboard/page.tsx.
 *
 * Tags let us invalidate manually via `revalidateTag()` — currently only used
 * for TTL expiry.
 */

const TTL_SECONDS = 10;

/** 5 latest team activity updates. */
export const getRecentActivities = unstable_cache(
  async () =>
    db.activityUpdate.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
      },
    }),
  ["dashboard:recent-activities"],
  { revalidate: TTL_SECONDS, tags: ["dashboard", "activities"] },
);

/** Unresolved conflict count (Ketua's alert badge). */
export const getUnresolvedConflictCount = unstable_cache(
  async () =>
    db.conflictReport.count({ where: { status: { not: "SELESAI" } } }),
  ["dashboard:conflict-count"],
  { revalidate: TTL_SECONDS, tags: ["dashboard", "conflicts"] },
);

/** Aggregate finance balance (Pemasukan / Pengeluaran totals). */
export const getFinanceAggregate = unstable_cache(
  async () =>
    db.financialTransaction.groupBy({ by: ["type"], _sum: { amount: true } }),
  ["dashboard:finance-aggregate"],
  { revalidate: TTL_SECONDS, tags: ["dashboard", "finance"] },
);

/** Up to 3 upcoming meetings. */
export const getUpcomingMeetings = unstable_cache(
  async () => {
    const now = new Date();
    return db.meeting.findMany({
      where: {
        scheduledAt: { gte: now },
        status: { in: ["TERJADWAL", "BERLANGSUNG"] },
      },
      orderBy: { scheduledAt: "asc" },
      take: 3,
      include: { _count: { select: { attendees: true } } },
    });
  },
  ["dashboard:upcoming-meetings"],
  { revalidate: TTL_SECONDS, tags: ["dashboard", "meetings"] },
);

/**
 * Today's consumption duty roster. Cached with today's date in the key so
 * midnight rollover creates a fresh cache entry.
 */
export const getTodayConsumptionDuty = unstable_cache(
  async (todayKey: string) => {
    const start = new Date(todayKey);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return db.consumptionDuty.findFirst({
      where: { date: { gte: start, lt: end } },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
  },
  ["dashboard:today-duty"],
  { revalidate: TTL_SECONDS, tags: ["dashboard", "consumption"] },
);
