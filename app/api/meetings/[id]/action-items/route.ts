import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { actionItemDescriptionToTaskTitle } from "@/lib/services/action-item-sync";
import { createActionItemSchema } from "@/lib/validators/meeting";
import { hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "rapat.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = createActionItemSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const { id } = await params;

  // Ensure assignee is an active user.
  const assignee = await db.user.findUnique({
    where: { id: parsed.data.assignedToId },
    select: { id: true, isActive: true },
  });
  if (!assignee || !assignee.isActive) {
    return apiErr("Penerima tidak ditemukan atau tidak aktif", 400);
  }

  // Create Task + ActionItem atomically. The Task mirrors the action item so
  // meeting follow-ups also show up on the Kanban board.
  const created = await db.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        title: actionItemDescriptionToTaskTitle(parsed.data.description),
        description: `Tindak lanjut rapat.`,
        status: "TODO",
        priority: "MEDIUM",
        points: 3,
        dueDate: parsed.data.dueDate,
        createdById: session.user.id,
        assignees: {
          create: [{ userId: parsed.data.assignedToId }],
        },
      },
    });

    return tx.actionItem.create({
      data: {
        meetingId: id,
        description: parsed.data.description,
        assignedToId: parsed.data.assignedToId,
        dueDate: parsed.data.dueDate,
        taskId: task.id,
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  });

  return apiOk(created, undefined, { status: 201 });
}
