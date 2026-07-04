import { CalendarDays, CalendarClock, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MeetingStatusBadge } from "@/components/meetings/meeting-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { NewMeetingDialog } from "./new-meeting-dialog";

export default async function RapatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const canCreate = hasPermission(session.user.role, "rapat.crud");

  const [meetings, members] = await Promise.all([
    db.meeting.findMany({
      orderBy: { scheduledAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { attendees: true } },
      },
    }),
    canCreate
      ? db.user.findMany({
          // SUPER_ADMIN dikeluarkan dari daftar peserta — admin bukan bagian
          // operasional harian tim.
          where: { isActive: true, role: { not: "SUPER_ADMIN" } },
          select: { id: true, name: true, role: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const now = new Date();
  // Cancelled meetings stay visible as informational entries in Riwayat —
  // they are NOT deleted, only marked. Use DELETE (Ketua-only) to remove.
  const upcoming = meetings.filter(
    (m) =>
      m.scheduledAt >= now &&
      m.status !== "DIBATALKAN" &&
      m.status !== "SELESAI"
  );
  const past = meetings.filter(
    (m) =>
      m.status === "SELESAI" ||
      m.status === "DIBATALKAN" ||
      m.scheduledAt < now
  );

  return (
    <div>
      <PageHeader
        title="Rapat"
        description="Jadwalkan, kelola absensi, dan dokumentasikan hasil rapat."
        action={
          canCreate ? <NewMeetingDialog members={members} /> : undefined
        }
      />

      <SectionHeader label="Akan Datang" count={upcoming.length} />
      <div className="mb-6 space-y-2">
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Tidak ada rapat mendatang"
            description={
              canCreate
                ? "Jadwalkan rapat berikutnya agar tim tahu kapan berkumpul."
                : "Belum ada rapat yang dijadwalkan."
            }
            action={
              canCreate ? (
                <NewMeetingDialog
                  members={members}
                  triggerLabel="Jadwalkan Rapat"
                />
              ) : undefined
            }
            compact
          />
        ) : (
          upcoming.map((m) => <MeetingRow key={m.id} m={m} highlight />)
        )}
      </div>

      <SectionHeader label="Riwayat" count={past.length} />
      <div className="space-y-2">
        {past.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Belum ada riwayat rapat"
            compact
          />
        ) : (
          past.map((m) => <MeetingRow key={m.id} m={m} />)
        )}
      </div>
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </h2>
      <span className="text-xs font-medium tabular-nums text-muted-foreground">
        {count} {count === 1 ? "item" : "item"}
      </span>
    </div>
  );
}

type MeetingRowData = {
  id: string;
  title: string;
  status: import("@/lib/generated/prisma/client").MeetingStatus;
  scheduledAt: Date;
  location: string | null;
  _count: { attendees: number };
};

function MeetingRow({ m, highlight = false }: { m: MeetingRowData; highlight?: boolean }) {
  return (
    <Link
      href={`/rapat/${m.id}`}
      className={
        "group block rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            "grid h-10 w-10 shrink-0 place-items-center rounded-lg " +
            (highlight
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground")
          }
        >
          <CalendarDays className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="truncate font-medium leading-tight group-hover:text-primary">
              {m.title}
            </p>
            <MeetingStatusBadge status={m.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(m.scheduledAt)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {m.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {m.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {m._count.attendees} peserta
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
