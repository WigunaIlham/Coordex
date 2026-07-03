import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { StakeholderClient } from "./stakeholder-client";

export default async function PemangkuPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!hasPermission(session.user.role, "pemangku.crud")) redirect("/dashboard");

  const rows = await db.stakeholder.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { contactHistory: true } },
    },
  });

  const serialised = rows.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    phone: s.phone,
    address: s.address,
    notes: s.notes,
    createdBy: s.createdBy,
    interactionCount: s._count.contactHistory,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Pemangku Kepentingan"
        description="Katalog kontak & riwayat interaksi dengan stakeholder desa."
      />
      <StakeholderClient initial={serialised} />
    </div>
  );
}
