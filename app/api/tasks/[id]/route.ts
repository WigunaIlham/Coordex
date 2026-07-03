import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskStatusToActionItemStatus } from "@/lib/services/action-item-sync";
import { updateTaskSchema } from "@/lib/validators/task";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const task = await db.task.findUnique({
    where: { id },
    include: {
      assignees: {
        include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
      },
      createdBy: { select: { id: true, name: true, avatarUrl: true } },
      attachments: true,
    },
  });
  if (!task) return apiErr("Tugas tidak ditemukan", 404);
  return apiOk(task);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const task = await db.task.findUnique({
    where: { id },
    select: { createdById: true, assignees: { select: { userId: true } } },
  });
  if (!task) return apiErr("Tugas tidak ditemukan", 404);

  const isAssignee = task.assignees.some((a) => a.userId === session.user.id);
  const isCreator = task.createdById === session.user.id;
  const isKetua = isAdminOrKetua(session.user.role);

  const body = await req.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const editingOnlyStatus =
    Object.keys(parsed.data).length === 1 && "status" in parsed.data;

  if (editingOnlyStatus) {
    if (!isAssignee && !isKetua) {
      return apiErr("Anda tidak punya akses untuk mengubah tugas ini", 403);
    }
  } else if (!isCreator && !isKetua) {
    return apiErr("Hanya pembuat tugas atau Ketua yang dapat mengedit", 403);
  }

  const updated = await db.$transaction(async (tx) => {
    const t = await tx.task.update({
      where: { id },
      data: parsed.data,
      include: {
        assignees: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
        },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        actionItem: { select: { id: true } },
      },
    });
    if (parsed.data.status !== undefined && t.actionItem) {
      await tx.actionItem.update({
        where: { id: t.actionItem.id },
        data: { status: taskStatusToActionItemStatus(parsed.data.status) },
      });
    }
    return t;
  });
  return apiOk(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role)) {
    return apiErr("Hanya Ketua yang dapat menghapus tugas", 403);
  }
  const { id } = await params;
  await db.task.delete({ where: { id } });
  return apiOk({ ok: true });
}
