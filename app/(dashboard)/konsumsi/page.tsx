import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConsumptionClient } from "./consumption-client";
import { isAdminOrKetua } from "@/lib/permissions";

export default async function KonsumsiPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  fromDate.setDate(fromDate.getDate() - 7);

  const [duties, members, swaps] = await Promise.all([
    db.consumptionDuty.findMany({
      where: {
        date: { gte: fromDate },
        // Hide legacy/orphan duties with zero members (from old seeds or
        // aborted generations). Empty rows only add noise to the calendar.
        members: { some: {} },
      },
      orderBy: { date: "asc" },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, role: true } },
          },
        },
      },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    db.consumptionSwap.findMany({
      where:
        isAdminOrKetua(session.user.role)
          ? { status: "PENDING" }
          : {
              status: "PENDING",
              OR: [
                { requesterId: session.user.id },
                { targetId: session.user.id },
              ],
            },
      include: {
        requester: { select: { id: true, name: true } },
        target: { select: { id: true, name: true } },
        duty: { select: { id: true, date: true } },
      },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Jadwal Konsumsi"
        description="Rotasi tugas konsumsi harian untuk seluruh anggota."
      />
      <ConsumptionClient
        currentUserId={session.user.id}
        isKetua={isAdminOrKetua(session.user.role)}
        initialDuties={duties.map((d) => ({
          id: d.id,
          date: d.date.toISOString(),
          members: d.members.map((m) => m.user),
        }))}
        members={members}
        initialSwaps={swaps.map((s) => ({
          id: s.id,
          requesterId: s.requesterId,
          targetId: s.targetId,
          requester: s.requester,
          target: s.target,
          duty: { id: s.duty.id, date: s.duty.date.toISOString() },
          reason: s.reason,
        }))}
      />
    </div>
  );
}
