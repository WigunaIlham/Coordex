import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RabListClient } from "./rab-list-client";
import { isAdminOrKetua } from "@/lib/permissions";

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

  const canCreate =
    isAdminOrKetua(session.user.role) || session.user.role === "BENDAHARA";

  return (
    <div>
      <PageHeader
        title="Rencana Anggaran Biaya (RAB)"
        description="Buat dokumen RAB per kegiatan / periode. Auto-hitung subtotal & grand total."
      />
      <RabListClient initial={summary} canCreate={canCreate} />
    </div>
  );
}
