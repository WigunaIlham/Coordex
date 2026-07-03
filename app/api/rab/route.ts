import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createRabSchema } from "@/lib/validators/rab";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const rabs = await db.rab.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { categories: true } },
    },
  });
  return apiOk(rabs);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role) && session.user.role !== "BENDAHARA") {
    return apiErr("Hanya Ketua/Bendahara yang dapat membuat RAB", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = createRabSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const rab = await db.rab.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { categories: true } },
    },
  });

  return apiOk(rab, undefined, { status: 201 });
}
