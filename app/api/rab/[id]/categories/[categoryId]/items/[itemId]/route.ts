import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateItemSchema } from "@/lib/validators/rab";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; categoryId: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role) && session.user.role !== "BENDAHARA") {
    return apiErr("Hanya Ketua/Bendahara yang dapat mengubah RAB", 403);
  }

  const { itemId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const updated = await db.rabItem.update({
    where: { id: itemId },
    data: parsed.data,
  });
  return apiOk(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; categoryId: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role) && session.user.role !== "BENDAHARA") {
    return apiErr("Hanya Ketua/Bendahara yang dapat mengubah RAB", 403);
  }

  const { itemId } = await params;
  await db.rabItem.delete({ where: { id: itemId } });
  return apiOk({ ok: true });
}
