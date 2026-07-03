import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { createStakeholderSchema } from "@/lib/validators/stakeholder";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const rows = await db.stakeholder.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { contactHistory: true } },
    },
  });
  return apiOk(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "pemangku.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }
  const body = await req.json().catch(() => null);
  const parsed = createStakeholderSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const stakeholder = await db.stakeholder.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { contactHistory: true } },
    },
  });
  return apiOk(stakeholder, undefined, { status: 201 });
}
