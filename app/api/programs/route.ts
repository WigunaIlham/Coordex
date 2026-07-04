import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { createProgramSchema } from "@/lib/validators/program";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const programs = await db.program.findMany({
    orderBy: [{ cycle: "asc" }, { createdAt: "desc" }],
    include: {
      pic: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });
  return apiOk(programs);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "program.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = createProgramSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const program = await db.program.create({
    data: {
      cycle: parsed.data.cycle,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      startDate: parsed.data.startDate,
      targetDate: parsed.data.targetDate,
      picId: parsed.data.picId,
    },
    include: {
      pic: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });
  return apiOk(program, undefined, { status: 201 });
}
