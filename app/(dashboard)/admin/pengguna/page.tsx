import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UsersAdminClient } from "./users-admin-client";
import { hasPermission } from "@/lib/permissions";

export default async function AdminPenggunaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!hasPermission(session.user.role, "admin.users")) redirect("/dashboard");

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      studentId: true,
      phone: true,
      isActive: true,
      isPasswordChanged: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Kelola Pengguna"
        description="Buat akun anggota baru, ubah peran, atau nonaktifkan akun."
      />
      <UsersAdminClient
        initialUsers={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
        currentUserId={session.user.id}
      />
    </div>
  );
}
