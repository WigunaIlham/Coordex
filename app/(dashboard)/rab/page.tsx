import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { PagePoller } from "@/components/shared/page-poller";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { RabListClient } from "./rab-list-client";

export default async function RabPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const rabs = await db.rab.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      categories: {
        include: { items: { select: { volume: true, unitPrice: true } } },
      },
    },
  });

  const summary = rabs.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    divisi: r.divisi,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    createdBy: r.createdBy,
    categoryCount: r.categories.length,
    itemCount: r.categories.reduce((sum, c) => sum + c.items.length, 0),
    grandTotal: r.categories.reduce(
      (sum, c) =>
        sum + c.items.reduce((s, it) => s + Number(it.volume) * Number(it.unitPrice), 0),
      0,
    ),
  }));

  const canCreate = hasPermission(session.user.role, "rab.crud");

  return (
    <div>
      <PagePoller />
      <PageHeader
        title="Rencana Anggaran Biaya (RAB)"
        description="Semua anggota bisa buat RAB. Tandai status Draft / Revisi / Fix biar tim tahu mana yang final."
      />
      <RabListClient
        initial={summary}
        canCreate={canCreate}
        currentUserId={session.user.id}
      />
    </div>
  );
}
