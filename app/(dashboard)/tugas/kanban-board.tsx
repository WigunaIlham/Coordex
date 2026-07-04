"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { KanbanColumn } from "@/components/tasks/kanban-column";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { TaskForm } from "@/components/tasks/task-form";
import {
  PRIORITY_META,
  STATUS_COLUMNS,
} from "@/components/tasks/task-meta";
import type { AssigneeOption, TaskCardData } from "@/components/tasks/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role, TaskPriority, TaskStatus } from "@/lib/generated/prisma/client";

type Props = {
  initialTasks: TaskCardData[];
  members: AssigneeOption[];
  currentUserId: string;
  currentUserRole: Role;
};

const PRIORITY_KEYS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function KanbanBoard({
  initialTasks,
  members,
  currentUserId,
  currentUserRole,
}: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [prevInitial, setPrevInitial] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">("ALL");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskCardData | null>(null);
  const [detailTask, setDetailTask] = useState<TaskCardData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TaskCardData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canDelete =
    currentUserRole === "KETUA" || currentUserRole === "SUPER_ADMIN";

  // Sync local state when server props change (React 19 pattern for derived state).
  if (prevInitial !== initialTasks) {
    setPrevInitial(initialTasks);
    setTasks(initialTasks);
  }

  const sensors = useSensors(
    // MouseSensor: desktop pointer. Small distance threshold so click vs drag
    // stays snappy.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // TouchSensor: HP + tablet. Delay 200ms + tolerance so tap-to-open still
    // works but hold-and-drag triggers reliably (prevents scrolling from
    // hijacking short touches).
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visible = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (assigneeFilter !== "ALL" && !t.assignees.some((a) => a.id === assigneeFilter))
        return false;
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, search, assigneeFilter, priorityFilter]);

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskCardData[]> = {
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
    };
    for (const t of visible) map[t.status].push(t);
    return map;
  }, [visible]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  async function moveTask(taskId: string, newStatus: TaskStatus) {
    const current = tasks.find((t) => t.id === taskId);
    if (!current || current.status === newStatus) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    const res = await fetch(`/api/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error?.message ?? "Gagal memperbarui status");
      // rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: current.status } : t))
      );
      return;
    }
    router.refresh();
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = String(active.id);
    const overData = over.data.current as { status?: TaskStatus } | undefined;
    let targetStatus: TaskStatus | undefined = overData?.status;
    if (!targetStatus) {
      const overTask = tasks.find((t) => t.id === over.id);
      targetStatus = overTask?.status;
    }
    if (!targetStatus) return;
    moveTask(taskId, targetStatus);
  }

  // Stable callbacks so memoized TaskCard/KanbanColumn don't re-render every
  // parent update.
  const handleCardClick = useCallback((task: TaskCardData) => {
    setDetailTask(task);
    setDetailOpen(true);
  }, []);

  const handleSaved = useCallback((saved: TaskCardData) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === saved.id);
      return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev];
    });
    setEditTask(null);
    router.refresh();
  }, [router]);

  const handleDeleted = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    router.refresh();
  }, [router]);

  const handleCardDelete = useCallback((task: TaskCardData) => {
    setPendingDelete(task);
  }, []);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setDeletingId(id);
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setDeletingId(null);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menghapus");
      return;
    }
    toast.success("Tugas dihapus");
    setPendingDelete(null);
    handleDeleted(id);
  }

  function openCreate() {
    setEditTask(null);
    setFormOpen(true);
  }

  function openEdit(task: TaskCardData) {
    setEditTask(task);
    setFormOpen(true);
  }

  const activeFilterCount =
    (assigneeFilter !== "ALL" ? 1 : 0) + (priorityFilter !== "ALL" ? 1 : 0);
  const totalVisible = visible.length;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Toolbar row: search grows, filters compact, action pinned right.
          On mobile: search full width; filters wrap; action floats. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Cari judul tugas…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
            aria-label="Cari tugas"
          />
        </div>
        <Select
          value={assigneeFilter}
          onValueChange={(v) => v && setAssigneeFilter(v)}
        >
          <SelectTrigger className="h-9 w-full sm:w-48">
            <SelectValue placeholder="Anggota" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua anggota</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name} · {ROLE_LABELS[m.role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={(v) => v && setPriorityFilter(v as TaskPriority | "ALL")}
        >
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue placeholder="Prioritas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua prioritas</SelectItem>
            {PRIORITY_KEYS.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_META[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              setAssigneeFilter("ALL");
              setPriorityFilter("ALL");
              setSearch("");
            }}
          >
            Reset filter · {activeFilterCount}
          </Button>
        )}

        <div className="sm:ml-auto">
          <Button onClick={openCreate} size="sm" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Tugas Baru
          </Button>
        </div>
      </div>

      {/* Result counter (subtle context) */}
      <p className="text-[11px] text-muted-foreground" aria-live="polite">
        {totalVisible} dari {tasks.length} tugas ditampilkan
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-x-auto md:grid-cols-2 xl:grid-cols-4">
          {STATUS_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.value}
              status={col.value}
              label={col.label}
              tasks={byStatus[col.value]}
              onCardClick={handleCardClick}
              onCardDelete={canDelete ? handleCardDelete : undefined}
            />
          ))}
        </div>
        <DragOverlay>{activeTask && <TaskCard task={activeTask} />}</DragOverlay>
      </DndContext>

      <TaskForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditTask(null);
        }}
        members={members}
        onSaved={handleSaved}
        editTask={editTask}
      />

      <TaskDetailDialog
        task={detailTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onEdit={openEdit}
        onDeleted={handleDeleted}
      />

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && !deletingId && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus tugas?</DialogTitle>
            <DialogDescription>
              Tugas &quot;{pendingDelete?.title}&quot; akan dihapus permanen
              beserta lampiran dan action item yang terkait. Tindakan ini tidak
              dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPendingDelete(null)}
              disabled={!!deletingId}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={!!deletingId}
            >
              {deletingId && (
                <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
