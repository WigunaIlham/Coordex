import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { createAchievementSchema } from "@/lib/validators/achievement";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const achievements = await db.achievement.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
  return apiOk(achievements);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "pencapaian.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = createAchievementSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const achievement = await db.achievement.create({
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      url: parsed.data.url || null,
      publishedDate: parsed.data.publishedDate,
      authorId: session.user.id,
    },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
  return apiOk(achievement, undefined, { status: 201 });
}
