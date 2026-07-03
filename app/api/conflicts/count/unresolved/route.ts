import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role)) return apiErr("Forbidden", 403);

  const count = await db.conflictReport.count({
    where: { status: { not: "SELESAI" } },
  });
  return apiOk({ count });
}
