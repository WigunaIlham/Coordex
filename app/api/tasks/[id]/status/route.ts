import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskStatusToActionItemStatus } from "@/lib/services/action-item-sync";
import { updateTaskStatusSchema } from "@/lib/validators/task";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const task = await db.task.findUnique({
    where: { id },
    select: {
      assignees: { select: { userId: true } },
      actionItem: { select: { id: true } },
    },
  });
  if (!task) return apiErr("Tugas tidak ditemukan", 404);

  const isAssignee = task.assignees.some((a) => a.userId === session.user.id);
  if (!isAssignee && !isAdminOrKetua(session.user.role)) {
    return apiErr("Anda tidak punya akses untuk mengubah status tugas ini", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateTaskStatusSchema.safeParse(body);
  if (!parsed.success) return apiErr("Status tidak valid", 400);

  const updated = await db.$transaction(async (tx) => {
    const t = await tx.task.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, status: true },
    });
    if (task.actionItem) {
      await tx.actionItem.update({
        where: { id: task.actionItem.id },
        data: { status: taskStatusToActionItemStatus(parsed.data.status) },
      });
    }
    return t;
  });
  return apiOk(updated);
}
