import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { updateStakeholderSchema } from "@/lib/validators/stakeholder";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  const { id } = await params;

  const row = await db.stakeholder.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      contactHistory: {
        orderBy: { date: "desc" },
        include: { recordedBy: { select: { id: true, name: true } } },
      },
    },
  });
  if (!row) return apiErr("Tidak ditemukan", 404);
  return apiOk(row);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "pemangku.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateStakeholderSchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  const updated = await db.stakeholder.update({ where: { id }, data: parsed.data });
  return apiOk(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "pemangku.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }
  const { id } = await params;
  await db.stakeholder.delete({ where: { id } });
  return apiOk({ ok: true });
}
