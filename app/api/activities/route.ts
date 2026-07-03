import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { activityQuerySchema, createActivitySchema } from "@/lib/validators/activity";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = activityQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return apiErr("Query tidak valid", 400);

  const { category, authorId, isMilestone, page, limit } = parsed.data;

  const where: Prisma.ActivityUpdateWhereInput = {};
  if (category) where.category = category;
  if (authorId) where.authorId = authorId;
  if (isMilestone === "true") where.isMilestone = true;

  const [items, total] = await Promise.all([
    db.activityUpdate.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.activityUpdate.count({ where }),
  ]);

  return apiOk(items, { total, page, limit, pageCount: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createActivitySchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const created = await db.activityUpdate.create({
    data: { ...parsed.data, authorId: session.user.id },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });
  return apiOk(created, undefined, { status: 201 });
}
