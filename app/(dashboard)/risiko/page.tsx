import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { RiskClient } from "./risk-client";

export default async function RisikoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!hasPermission(session.user.role, "risiko.crud")) redirect("/dashboard");

  const risks = await db.risk.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { id: true, name: true } } },
  });

  const serialised = risks.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    probability: r.probability,
    impact: r.impact,
    mitigationPlan: r.mitigationPlan,
    status: r.status,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Register Risiko"
        description="Identifikasi risiko program KKN dan rencanakan mitigasinya."
      />
      <RiskClient initialRisks={serialised} />
    </div>
  );
}
