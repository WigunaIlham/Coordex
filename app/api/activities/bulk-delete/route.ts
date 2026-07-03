import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
  const rawIds = body?.ids;
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return apiErr("Pilih minimal satu aktivitas", 400);
  }
  const ids = rawIds.filter((v): v is string => typeof v === "string");
  if (ids.length === 0) return apiErr("ID tidak valid", 400);
  if (ids.length > 200) return apiErr("Maksimal 200 item per aksi", 400);

  const admin = isAdminOrKetua(session.user.role);
  const result = await db.activityUpdate.deleteMany({
    where: admin
      ? { id: { in: ids } }
      : { id: { in: ids }, authorId: session.user.id },
  });
  return apiOk({ deleted: result.count });
}
