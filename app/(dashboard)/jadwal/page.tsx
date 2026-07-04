import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConsumptionClient } from "@/app/(dashboard)/konsumsi/consumption-client";
import { isAdminOrKetua } from "@/lib/permissions";
import { JadwalTabs } from "./jadwal-tabs";

type DutyType = "KONSUMSI" | "PIKET";

export default async function JadwalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { tab } = await searchParams;
  const activeTab: DutyType = tab === "piket" ? "PIKET" : "KONSUMSI";

  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  fromDate.setDate(fromDate.getDate() - 7);

  const [duties, members, swaps] = await Promise.all([
    db.consumptionDuty.findMany({
      where: {
        date: { gte: fromDate },
        type: activeTab,
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
          ? { status: "PENDING", duty: { type: activeTab } }
          : {
              status: "PENDING",
              duty: { type: activeTab },
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
        title="Jadwal"
        description="Jadwal konsumsi & piket harian tim."
      />
      <JadwalTabs active={activeTab === "PIKET" ? "piket" : "konsumsi"} />
      <ConsumptionClient
        key={activeTab}
        dutyType={activeTab}
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
