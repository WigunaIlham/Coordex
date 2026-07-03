import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

async function ensureCanManageAssignees(
  taskId: string,
  sessionUserId: string,
  isKetua: boolean
) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { createdById: true },
  });
  if (!task) return { error: apiErr("Tugas tidak ditemukan", 404) };
  if (task.createdById !== sessionUserId && !isKetua) {
    return { error: apiErr("Hanya pembuat tugas atau Ketua yang dapat mengubah anggota", 403) };
  }
  return { error: null };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id, userId } = await params;
  const { error } = await ensureCanManageAssignees(id, session.user.id, isAdminOrKetua(session.user.role));
  if (error) return error;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return apiErr("Anggota tidak valid", 400);

  await db.taskAssignee.upsert({
    where: { taskId_userId: { taskId: id, userId } },
    update: {},
    create: { taskId: id, userId },
  });
  return apiOk({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id, userId } = await params;
  const { error } = await ensureCanManageAssignees(id, session.user.id, isAdminOrKetua(session.user.role));
  if (error) return error;

  const count = await db.taskAssignee.count({ where: { taskId: id } });
  if (count <= 1) return apiErr("Tugas harus memiliki minimal 1 anggota", 400);

  await db.taskAssignee.delete({
    where: { taskId_userId: { taskId: id, userId } },
  });
  return apiOk({ ok: true });
}
