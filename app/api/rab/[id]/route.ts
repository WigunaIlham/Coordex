import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, isAdminOrKetua } from "@/lib/permissions";
import type { Role } from "@/lib/generated/prisma/client";
import { updateRabSchema } from "@/lib/validators/rab";

export const runtime = "nodejs";

async function loadOrAuth(id: string, userId: string, role: Role) {
  const rab = await db.rab.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      categories: {
        orderBy: { order: "asc" },
        include: { items: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!rab) return { error: apiErr("RAB tidak ditemukan", 404), rab: null };
  // Semua user bisa view; edit hanya owner atau admin/ketua.
  const canEdit =
    rab.createdById === userId ||
    isAdminOrKetua(role) ||
    hasPermission(role, "rab.approve");
  return { error: null, rab, canEdit };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  const { id } = await params;
  const { error, rab } = await loadOrAuth(id, session.user.id, session.user.role);
  if (error) return error;
  return apiOk(rab);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  const { id } = await params;
  const { error, canEdit } = await loadOrAuth(id, session.user.id, session.user.role);
  if (error) return error;
  if (!canEdit) return apiErr("Tidak diizinkan", 403);

  const body = await req.json().catch(() => null);
  const parsed = updateRabSchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  const updated = await db.rab.update({ where: { id }, data: parsed.data });
  return apiOk(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  const { id } = await params;
  const { error, canEdit } = await loadOrAuth(id, session.user.id, session.user.role);
  if (error) return error;
  if (!canEdit) return apiErr("Tidak diizinkan", 403);

  await db.rab.delete({ where: { id } });
  return apiOk({ ok: true });
}
