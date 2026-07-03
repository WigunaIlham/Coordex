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

  const unresolvedConflicts = isAdminOrKetua(session.user.role)
    ? await db.conflictReport.count({ where: { status: { not: "SELESAI" } } })
    : undefined;

  const sidebarUser = {
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    avatarUrl: session.user.image,
    role: session.user.role,
  };

  return (
    <AppShell user={sidebarUser} unresolvedConflicts={unresolvedConflicts}>
      {children}
    </AppShell>
  );
}
