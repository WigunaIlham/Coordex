import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createItemSchema } from "@/lib/validators/rab";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role) && session.user.role !== "BENDAHARA") {
    return apiErr("Hanya Ketua/Bendahara yang dapat mengubah RAB", 403);
  }

  const { categoryId } = await params;
  const cat = await db.rabCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!cat) return apiErr("Kategori tidak ditemukan", 404);

  const body = await req.json().catch(() => null);
  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const last = await db.rabItem.findFirst({
    where: { categoryId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const item = await db.rabItem.create({
    data: {
      categoryId,
      name: parsed.data.name,
      volume: parsed.data.volume,
      unit: parsed.data.unit,
      unitPrice: parsed.data.unitPrice,
      notes: parsed.data.notes ?? null,
      order: (last?.order ?? -1) + 1,
    },
  });
  return apiOk(item, undefined, { status: 201 });
}
