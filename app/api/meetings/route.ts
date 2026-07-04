import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { hasPermission } from "@/lib/permissions";
import {
  MeetingStatusEnum,
  createMeetingSchema,
} from "@/lib/validators/meeting";

export const runtime = "nodejs";

function canCreate(role: import("@/lib/generated/prisma/client").Role) {
  return hasPermission(role, "rapat.crud");
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const upcoming = url.searchParams.get("upcoming");

  const where: Prisma.MeetingWhereInput = {};
  if (status) {
    const parsed = MeetingStatusEnum.safeParse(status);
    if (parsed.success) where.status = parsed.data;
  }
  if (upcoming === "true") {
    where.scheduledAt = { gte: new Date() };
    where.status = { in: ["TERJADWAL", "BERLANGSUNG"] };
  }

  const meetings = await db.meeting.findMany({
    where,
    orderBy: { scheduledAt: upcoming === "true" ? "asc" : "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { attendees: true } },
    },
  });
  return apiOk(meetings);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!canCreate(session.user.role)) {
    return apiErr("Anda tidak punya akses untuk membuat rapat", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = createMeetingSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const { attendeeIds, ...rest } = parsed.data;
  const validUsers = await db.user.findMany({
    // Admin selalu difilter dari peserta — bukan bagian operasional tim.
    where: {
      id: { in: attendeeIds },
      isActive: true,
      role: { not: "SUPER_ADMIN" },
    },
    select: { id: true },
  });
  if (validUsers.length !== attendeeIds.length) {
    return apiErr("Beberapa peserta tidak ditemukan / tidak aktif", 400);
  }

  const created = await db.meeting.create({
    data: {
      ...rest,
      location: rest.location ?? null,
      agenda: rest.agenda ?? null,
      createdById: session.user.id,
      attendees: {
        create: attendeeIds.map((userId) => ({ userId })),
      },
    },
    include: {
      attendees: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  return apiOk(created, undefined, { status: 201 });
}
