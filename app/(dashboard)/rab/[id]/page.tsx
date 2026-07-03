import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RabEditorClient } from "./rab-editor-client";
import { isAdminOrKetua } from "@/lib/permissions";

export default async function RabDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const rab = await db.rab.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      categories: {
        orderBy: { order: "asc" },
        include: { items: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!rab) redirect("/rab");

  const canEdit =
    isAdminOrKetua(session.user.role) || session.user.role === "BENDAHARA";

  const serialised = {
    id: rab.id,
    title: rab.title,
    description: rab.description,
    createdAt: rab.createdAt.toISOString(),
    createdBy: rab.createdBy,
    categories: rab.categories.map((c) => ({
      id: c.id,
      name: c.name,
      order: c.order,
      items: c.items.map((it) => ({
        id: it.id,
        name: it.name,
        volume: it.volume.toString(),
        unit: it.unit,
        unitPrice: it.unitPrice.toString(),
        notes: it.notes,
        order: it.order,
      })),
    })),
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={rab.title}
        description={rab.description ?? undefined}
        breadcrumb={[
          { label: "RAB", href: "/rab" },
          { label: rab.title },
        ]}
      />
      <RabEditorClient rab={serialised} canEdit={canEdit} />
    </div>
  );
}
