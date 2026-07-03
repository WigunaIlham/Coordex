import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminOrKetua } from "@/lib/permissions";
import { updateMeetingSchema } from "@/lib/validators/meeting";

export const runtime = "nodejs";

function canEdit(role: string) {
  return role === "KETUA" || role === "SEKRETARIS";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const meeting = await db.meeting.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      attendees: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, role: true } },
        },
      },
      actionItems: {
        orderBy: { createdAt: "asc" },
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });
  if (!meeting) return apiErr("Rapat tidak ditemukan", 404);
  return apiOk(meeting);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const existing = await db.meeting.findUnique({
    where: { id },
    select: { createdById: true },
  });
  if (!existing) return apiErr("Rapat tidak ditemukan", 404);

  if (!canEdit(session.user.role) && existing.createdById !== session.user.id) {
    return apiErr("Forbidden", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateMeetingSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const updated = await db.meeting.update({
    where: { id },
    data: parsed.data,
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
    return apiErr("Hanya Ketua yang dapat menghapus rapat", 403);
  }
  const { id } = await params;
  const exists = await db.meeting.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) return apiErr("Rapat tidak ditemukan", 404);
  // MeetingAttendee & ActionItem cascade via schema. Tasks linked to
  // action items keep existing (ActionItem.taskId → SetNull is on task
  // deletion; action items get cascade-deleted here so linked tasks are
  // simply orphaned from their originating meeting).
  await db.meeting.delete({ where: { id } });
  return apiOk({ ok: true });
}
