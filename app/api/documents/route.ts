import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const url = new URL(req.url);
  const templateType = url.searchParams.get("templateType");
  const where: Prisma.GeneratedDocumentWhereInput = {};
  if (templateType) where.templateType = templateType as Prisma.GeneratedDocumentWhereInput["templateType"];

  const items = await db.generatedDocument.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
    },
  });
  return apiOk(items);
}
