import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSwapSchema } from "@/lib/validators/consumption";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const where =
    isAdminOrKetua(session.user.role)
      ? {}
      : {
          OR: [
            { requesterId: session.user.id },
            { targetId: session.user.id },
          ],
        };

  const swaps = await db.consumptionSwap.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      requester: { select: { id: true, name: true } },
      target: { select: { id: true, name: true } },
      duty: { select: { id: true, date: true } },
    },
  });
  return apiOk(swaps);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSwapSchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  if (parsed.data.targetId === session.user.id) {
    return apiErr("Tidak bisa tukar dengan diri sendiri", 400);
  }

  const duty = await db.consumptionDuty.findUnique({
    where: { id: parsed.data.dutyId },
    include: { members: { select: { userId: true } } },
  });
  if (!duty) return apiErr("Jadwal tidak ditemukan", 404);

  const requesterIsMember = duty.members.some(
    (m) => m.userId === session.user.id
  );
  if (!requesterIsMember) {
    return apiErr("Anda bukan bagian dari jadwal ini", 400);
  }

  const targetExists = await db.user.findUnique({
    where: { id: parsed.data.targetId, isActive: true },
    select: { id: true },
  });
  if (!targetExists) return apiErr("Target tidak valid", 400);

  const created = await db.consumptionSwap.create({
    data: {
      dutyId: parsed.data.dutyId,
      requesterId: session.user.id,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason ?? null,
    },
    include: {
      requester: { select: { id: true, name: true } },
      target: { select: { id: true, name: true } },
      duty: { select: { id: true, date: true } },
    },
  });
  return apiOk(created, undefined, { status: 201 });
}
