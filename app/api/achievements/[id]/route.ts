import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "pencapaian.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }
  const { id } = await params;
  await db.achievement.delete({ where: { id } });
  return apiOk({ ok: true });
}
