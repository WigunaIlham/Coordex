import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { createTaskSchema, taskQuerySchema } from "@/lib/validators/task";

export const runtime = "nodejs";

const taskInclude = {
  assignees: {
    include: {
      user: {
        select: { id: true, name: true, avatarUrl: true, role: true },
      },
    },
  },
  createdBy: { select: { id: true, name: true, avatarUrl: true } },
  _count: { select: { attachments: true } },
} satisfies Prisma.TaskInclude;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = taskQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return apiErr("Query tidak valid", 400);

  const { status, priority, assigneeId, search } = parsed.data;

  const where: Prisma.TaskWhereInput = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assignees = { some: { userId: assigneeId } };
  if (search) where.title = { contains: search, mode: "insensitive" };

  const tasks = await db.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return apiOk(tasks, { total: tasks.length });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const { assigneeIds, dueDate, ...rest } = parsed.data;

  // Validate assignees exist
  const validUsers = await db.user.findMany({
    where: { id: { in: assigneeIds }, isActive: true },
    select: { id: true },
  });
  if (validUsers.length !== assigneeIds.length) {
    return apiErr("Salah satu anggota tidak ditemukan atau tidak aktif", 400);
  }

  const task = await db.task.create({
    data: {
      ...rest,
      dueDate,
      createdById: session.user.id,
      assignees: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
    },
    include: taskInclude,
  });

  return apiOk(task, undefined, { status: 201 });
}
