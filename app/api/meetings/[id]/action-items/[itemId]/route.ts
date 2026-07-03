import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  actionItemDescriptionToTaskTitle,
  actionItemStatusToTaskStatus,
} from "@/lib/services/action-item-sync";
import { updateActionItemSchema } from "@/lib/validators/meeting";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { itemId } = await params;
  const item = await db.actionItem.findUnique({
    where: { id: itemId },
    select: { assignedToId: true, taskId: true },
  });
  if (!item) return apiErr("Action item tidak ditemukan", 404);

  const body = await req.json().catch(() => null);
  const parsed = updateActionItemSchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  const isAssignee = item.assignedToId === session.user.id;
  const isManager =
    isAdminOrKetua(session.user.role) || session.user.role === "SEKRETARIS";

  const wantsManagerFields =
    parsed.data.description !== undefined ||
    parsed.data.assignedToId !== undefined ||
    parsed.data.dueDate !== undefined;
  if (wantsManagerFields && !isManager) {
    return apiErr("Hanya Ketua/Sekretaris yang dapat mengubah detail", 403);
  }
  if (parsed.data.status !== undefined && !isAssignee && !isManager) {
    return apiErr("Hanya penerima atau Ketua yang dapat mengubah status", 403);
  }

  const updated = await db.$transaction(async (tx) => {
    const ai = await tx.actionItem.update({
      where: { id: itemId },
      data: parsed.data,
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Mirror any relevant changes into the linked Task.
    if (ai.taskId) {
      type TaskUpdate = {
        title?: string;
        dueDate?: Date | null;
        status?: ReturnType<typeof actionItemStatusToTaskStatus>;
      };
      const taskUpdate: TaskUpdate = {};
      if (parsed.data.description !== undefined) {
        taskUpdate.title = actionItemDescriptionToTaskTitle(parsed.data.description);
      }
      if (parsed.data.dueDate !== undefined) {
        taskUpdate.dueDate = parsed.data.dueDate;
      }
      if (parsed.data.status !== undefined) {
        taskUpdate.status = actionItemStatusToTaskStatus(parsed.data.status);
      }
      if (Object.keys(taskUpdate).length > 0) {
        await tx.task.update({ where: { id: ai.taskId }, data: taskUpdate });
      }
      if (parsed.data.assignedToId !== undefined) {
        // Replace assignees: keep it single (mirror of the action item PIC).
        await tx.taskAssignee.deleteMany({ where: { taskId: ai.taskId } });
        await tx.taskAssignee.create({
          data: { taskId: ai.taskId, userId: parsed.data.assignedToId },
        });
      }
    }

    return ai;
  });

  return apiOk(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role) && session.user.role !== "SEKRETARIS") {
    return apiErr("Forbidden", 403);
  }
  const { itemId } = await params;

  const item = await db.actionItem.findUnique({
    where: { id: itemId },
    select: { taskId: true },
  });
  if (!item) return apiErr("Action item tidak ditemukan", 404);

  await db.$transaction(async (tx) => {
    await tx.actionItem.delete({ where: { id: itemId } });
    // Delete the mirrored Task too — action items own their Task.
    if (item.taskId) {
      await tx.task.delete({ where: { id: item.taskId } }).catch(() => undefined);
    }
  });

  return apiOk({ ok: true });
}
