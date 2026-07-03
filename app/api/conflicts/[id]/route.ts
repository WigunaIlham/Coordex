import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const report = await db.conflictReport.findUnique({
    where: { id },
    include: {
      reporter: { select: { id: true, name: true, role: true } },
      managedBy: { select: { id: true, name: true } },
    },
  });
  if (!report) return apiErr("Laporan tidak ditemukan", 404);

  const isKetua = isAdminOrKetua(session.user.role);
  const isReporter = report.reporterId === session.user.id;
  if (!isKetua && !isReporter) {
    return apiErr("Anda tidak punya akses", 403);
  }

  // Hide reporter identity from Ketua if anonymous
  const sanitized =
    isKetua && report.isAnonymous
      ? { ...report, reporterId: null, reporter: null }
      : report;

  return apiOk(sanitized);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role)) {
    return apiErr("Hanya Ketua/Super Admin yang dapat menghapus laporan", 403);
  }

  const { id } = await params;
  const exists = await db.conflictReport.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) return apiErr("Laporan tidak ditemukan", 404);

  await db.conflictReport.delete({ where: { id } });
  return apiOk({ ok: true });
}
