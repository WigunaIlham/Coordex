import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { KanbanBoard } from "./kanban-board";

export default async function TugasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [tasks, members] = await Promise.all([
    db.task.findMany({
      include: {
        assignees: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, role: true } },
          },
        },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { attachments: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const cards = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    points: t.points,
    dueDate: t.dueDate?.toISOString() ?? null,
    createdBy: t.createdBy,
    assignees: t.assignees.map((a) => a.user),
    attachmentCount: t._count.attachments,
  }));

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <PageHeader
        title="Tugas"
        description="Drag-and-drop kartu untuk mengubah status."
      />
      <KanbanBoard
        initialTasks={cards}
        members={members}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
      />
    </div>
  );
}
