import { revalidateTag } from "next/cache";

import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { createRabSchema } from "@/lib/validators/rab";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const rabs = await db.rab.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { categories: true } },
    },
  });
  return apiOk(rabs);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "rab.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = createRabSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const rab = await db.rab.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      divisi: parsed.data.divisi,
      status: parsed.data.status,
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { categories: true } },
    },
  });

  revalidateTag("rab", "seconds");
  return apiOk(rab, undefined, { status: 201 });
}
