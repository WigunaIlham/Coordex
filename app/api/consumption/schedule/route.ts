import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminOrKetua } from "@/lib/permissions";
import { z } from "zod";

export const runtime = "nodejs";

const upsertDutySchema = z.object({
  date: z.string().min(8),
  userIds: z.array(z.string().min(1)).min(1, "Pilih minimal 1 anggota"),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const url = new URL(req.url);
  const yearStr = url.searchParams.get("year");
  const monthStr = url.searchParams.get("month");

  let start: Date | null = null;
  let end: Date | null = null;
  if (yearStr && monthStr) {
    const year = Number(yearStr);
    const month = Number(monthStr);
    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 1);
  }

  const where = start && end ? { date: { gte: start, lt: end } } : {};
  const duties = await db.consumptionDuty.findMany({
    where,
    orderBy: { date: "asc" },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
      },
      swaps: {
        where: { status: "PENDING" },
        select: {
          id: true,
          requesterId: true,
          targetId: true,
          status: true,
        },
      },
    },
  });
  return apiOk(duties);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role)) return apiErr("Forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = upsertDutySchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  // Normalize date to midnight local — matches how the generator stores it.
  const raw = new Date(parsed.data.date);
  if (Number.isNaN(raw.getTime())) return apiErr("Tanggal tidak valid", 400);
  const date = new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const uniqueIds = Array.from(new Set(parsed.data.userIds));

  const duty = await db.$transaction(async (tx) => {
    const existing = await tx.consumptionDuty.findFirst({
      where: { date: { gte: date, lt: nextDay } },
      select: { id: true },
    });
    if (existing) {
      await tx.consumptionDutyMember.deleteMany({
        where: { dutyId: existing.id },
      });
      await tx.consumptionDutyMember.createMany({
        data: uniqueIds.map((userId) => ({ dutyId: existing.id, userId })),
      });
      return tx.consumptionDuty.findUnique({
        where: { id: existing.id },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true, role: true },
              },
            },
          },
        },
      });
    }
    return tx.consumptionDuty.create({
      data: {
        date,
        members: { create: uniqueIds.map((userId) => ({ userId })) },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true, role: true },
            },
          },
        },
      },
    });
  });

  return apiOk(duty, undefined, { status: 201 });
}
