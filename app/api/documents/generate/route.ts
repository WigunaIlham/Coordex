import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  generateDocumentSchema,
  validateFormDataForTemplate,
} from "@/lib/validators/document";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = generateDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const missing = validateFormDataForTemplate(
    parsed.data.templateType,
    parsed.data.formData
  );
  if (missing) return apiErr(missing, 400);

  const created = await db.generatedDocument.create({
    data: {
      templateType: parsed.data.templateType,
      title: parsed.data.title,
      formData: parsed.data.formData as Prisma.InputJsonValue,
      createdById: session.user.id,
    },
    select: { id: true, templateType: true, title: true, createdAt: true },
  });
  return apiOk(created, undefined, { status: 201 });
}
