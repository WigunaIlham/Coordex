import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateStatusSchema } from "@/lib/validators/user";
import { hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "admin.users")) return apiErr("Hanya Ketua yang dapat mengubah status akun", 403);

  const body = await req.json().catch(() => null);
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const { id } = await params;
  if (id === session.user.id && !parsed.data.isActive) {
    return apiErr("Anda tidak dapat menonaktifkan akun Anda sendiri", 400);
  }

  const user = await db.user.update({
    where: { id },
    data: { isActive: parsed.data.isActive },
    select: { id: true, name: true, isActive: true },
  });
  return apiOk(user);
}
