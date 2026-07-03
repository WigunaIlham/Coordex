import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  ConflictCategoryEnum,
  ConflictStatusEnum,
  createConflictSchema,
} from "@/lib/validators/conflict";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  const isKetua = isAdminOrKetua(session.user.role);

  const url = new URL(req.url);
  const where: Prisma.ConflictReportWhereInput = {};
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");
  if (status) {
    const s = ConflictStatusEnum.safeParse(status);
    if (s.success) where.status = s.data;
  }
  if (category) {
    const c = ConflictCategoryEnum.safeParse(category);
    if (c.success) where.category = c.data;
  }

  if (!isKetua) where.reporterId = session.user.id;

  const reports = await db.conflictReport.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      reporter: { select: { id: true, name: true, role: true } },
      managedBy: { select: { id: true, name: true } },
    },
  });

  // For Ketua + anonymous reports, strip reporter from response
  const sanitized = reports.map((r) => {
    if (r.isAnonymous && isKetua) {
      return { ...r, reporterId: null, reporter: null };
    }
    return r;
  });
  return apiOk(sanitized);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createConflictSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const created = await db.conflictReport.create({
    data: {
      category: parsed.data.category,
      description: parsed.data.description,
      isAnonymous: parsed.data.isAnonymous,
      reporterId: session.user.id, // disimpan untuk audit, tidak dipakai di UI Ketua jika anonim
    },
    select: {
      id: true,
      category: true,
      status: true,
      isAnonymous: true,
      createdAt: true,
    },
  });
  return apiOk(created, undefined, { status: 201 });
}
