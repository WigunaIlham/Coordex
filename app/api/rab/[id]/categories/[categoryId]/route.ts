import { revalidateTag } from "next/cache";

import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateCategorySchema } from "@/lib/validators/rab";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role) && session.user.role !== "BENDAHARA") {
    return apiErr("Hanya Ketua/Bendahara yang dapat mengubah RAB", 403);
  }

  const { categoryId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  const updated = await db.rabCategory.update({
    where: { id: categoryId },
    data: parsed.data,
  });
  revalidateTag("rab", "seconds");
  return apiOk(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role) && session.user.role !== "BENDAHARA") {
    return apiErr("Hanya Ketua/Bendahara yang dapat mengubah RAB", 403);
  }

  const { categoryId } = await params;
  await db.rabCategory.delete({ where: { id: categoryId } });
  revalidateTag("rab", "seconds");
  return apiOk({ ok: true });
}
