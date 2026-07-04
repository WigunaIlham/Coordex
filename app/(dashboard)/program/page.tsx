import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { ProgramClient } from "./program-client";

export default async function ProgramPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!hasPermission(session.user.role, "program.crud")) redirect("/dashboard");

  const [programs, members] = await Promise.all([
    db.program.findMany({
      orderBy: [{ cycle: "asc" }, { createdAt: "desc" }],
      include: {
        pic: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialised = programs.map((p) => ({
    id: p.id,
    cycle: p.cycle,
    name: p.name,
    description: p.description,
    startDate: p.startDate?.toISOString() ?? null,
    targetDate: p.targetDate?.toISOString() ?? null,
    progress: p.progress,
    status: p.status,
    pic: p.pic,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Program Kerja"
        description="Rencanakan program per siklus KKN Sisdamas. Track PIC, progres, dan status."
      />
      <ProgramClient initial={serialised} members={members} />
    </div>
  );
}
