import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminOrKetua } from "@/lib/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [me, unresolvedConflicts] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, avatarUrl: true, role: true },
    }),
    isAdminOrKetua(session.user.role)
      ? db.conflictReport.count({ where: { status: { not: "SELESAI" } } })
      : Promise.resolve(undefined),
  ]);
  if (!me) redirect("/login");

  const sidebarUser = {
    name: me.name,
    email: me.email,
    avatarUrl: me.avatarUrl,
    role: me.role,
  };

  return (
    <AppShell user={sidebarUser} unresolvedConflicts={unresolvedConflicts}>
      {children}
    </AppShell>
  );
}
