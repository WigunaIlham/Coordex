import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCategorySchema } from "@/lib/validators/rab";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role) && session.user.role !== "BENDAHARA") {
    return apiErr("Hanya Ketua/Bendahara yang dapat mengubah RAB", 403);
  }
  const { id } = await params;
  const rab = await db.rab.findUnique({ where: { id }, select: { id: true } });
  if (!rab) return apiErr("RAB tidak ditemukan", 404);

  const body = await req.json().catch(() => null);
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const last = await db.rabCategory.findFirst({
    where: { rabId: id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const category = await db.rabCategory.create({
    data: {
      rabId: id,
      name: parsed.data.name,
      order: (last?.order ?? -1) + 1,
    },
    include: { items: true },
  });
  return apiOk(category, undefined, { status: 201 });
}
