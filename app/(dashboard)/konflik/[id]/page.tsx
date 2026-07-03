import { redirect } from "next/navigation";

import { ConflictStatusBadge } from "@/components/conflict/conflict-badges";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { CONFLICT_CATEGORY_LABELS } from "@/lib/validators/conflict";
import { ConflictDetailActions } from "./conflict-detail-actions";
import { isAdminOrKetua } from "@/lib/permissions";

export default async function KonflikDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isKetua = isAdminOrKetua(session.user.role);

  const { id } = await params;
  const report = await db.conflictReport.findUnique({
    where: { id },
    include: {
      reporter: { select: { id: true, name: true, role: true } },
      managedBy: { select: { id: true, name: true } },
    },
  });

  if (!report) redirect("/konflik");
  if (!isKetua && report.reporterId !== session.user.id) {
    redirect("/konflik");
  }

  const hideReporter = report.isAnonymous && isKetua;

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        title="Detail Laporan"
        breadcrumb={[
          { label: isKetua ? "Pusat Konflik" : "Laporan Saya", href: "/konflik" },
          { label: "Detail" },
        ]}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {CONFLICT_CATEGORY_LABELS[report.category]}
              </Badge>
              <ConflictStatusBadge status={report.status} />
              {report.isAnonymous && (
                <Badge variant="outline" className="text-xs">
                  Anonim
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(report.createdAt)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Pelapor</p>
            <p className="font-medium">
              {hideReporter
                ? "Anonim — identitas dirahasiakan"
                : report.reporter
                  ? report.reporter.name
                  : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Deskripsi</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{report.description}</p>
          </div>

          {report.resolutionNotes && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Catatan Resolusi
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{report.resolutionNotes}</p>
              {report.managedBy && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Ditangani oleh {report.managedBy.name}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isKetua && (
        <ConflictDetailActions
          id={report.id}
          status={report.status}
          resolutionNotes={report.resolutionNotes}
        />
      )}
    </div>
  );
}
