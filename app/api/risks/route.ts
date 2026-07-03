import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { createRiskSchema } from "@/lib/validators/risk";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const risks = await db.risk.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { id: true, name: true } } },
  });
  return apiOk(risks);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "risiko.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = createRiskSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const risk = await db.risk.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      probability: parsed.data.probability,
      impact: parsed.data.impact,
      mitigationPlan: parsed.data.mitigationPlan ?? null,
      createdById: session.user.id,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  return apiOk(risk, undefined, { status: 201 });
}
