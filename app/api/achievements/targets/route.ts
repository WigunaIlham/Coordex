import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { updateTargetSchema } from "@/lib/validators/achievement";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  const targets = await db.achievementTarget.findMany({ orderBy: { type: "asc" } });
  return apiOk(targets);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "pencapaian.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }
  const body = await req.json().catch(() => null);
  const parsed = updateTargetSchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  const updated = await db.achievementTarget.upsert({
    where: { type: parsed.data.type },
    update: {
      targetCount: parsed.data.targetCount,
      description: parsed.data.description ?? null,
    },
    create: {
      type: parsed.data.type,
      targetCount: parsed.data.targetCount,
      description: parsed.data.description ?? null,
    },
  });
  return apiOk(updated);
}
