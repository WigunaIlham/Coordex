import { redirect } from "next/navigation";

import { MeetingStatusBadge } from "@/components/meetings/meeting-status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { MeetingDetailClient } from "./meeting-detail-client";
import { isAdminOrKetua } from "@/lib/permissions";

export default async function RapatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const meeting = await db.meeting.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      attendees: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, role: true } },
        },
      },
      actionItems: {
        orderBy: { createdAt: "asc" },
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });
  if (!meeting) redirect("/rapat");

  const canManage =
    isAdminOrKetua(session.user.role) || session.user.role === "SEKRETARIS";
  const canDelete = isAdminOrKetua(session.user.role);

  return (
    <div className="space-y-4">
      <PageHeader
        title={meeting.title}
        description={`Dibuat oleh ${meeting.createdBy.name}`}
        breadcrumb={[
          { label: "Rapat", href: "/rapat" },
          { label: meeting.title },
        ]}
        action={<MeetingStatusBadge status={meeting.status} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Informasi Rapat</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Waktu</p>
            <p className="font-medium">{formatDateTime(meeting.scheduledAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Lokasi</p>
            <p className="font-medium">{meeting.location ?? "—"}</p>
          </div>
          {meeting.agenda && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Agenda</p>
              <p className="whitespace-pre-wrap font-medium">{meeting.agenda}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <MeetingDetailClient
        meetingId={meeting.id}
        meetingTitle={meeting.title}
        status={meeting.status}
        canManage={canManage}
        canDelete={canDelete}
        currentUserId={session.user.id}
        attendees={meeting.attendees.map((a) => ({
          userId: a.userId,
          attended: a.attended,
          notes: a.notes,
          user: a.user,
        }))}
        minutes={meeting.minutes ?? ""}
        actionItems={meeting.actionItems.map((ai) => ({
          id: ai.id,
          description: ai.description,
          assignedToId: ai.assignedToId,
          assignedTo: ai.assignedTo,
          dueDate: ai.dueDate?.toISOString() ?? null,
          status: ai.status,
        }))}
      />
    </div>
  );
}
