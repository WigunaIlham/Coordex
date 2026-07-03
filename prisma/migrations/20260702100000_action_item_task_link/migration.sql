-- Link ActionItem to a Task so meeting follow-ups also appear on the Kanban.

ALTER TABLE "action_items"
  ADD COLUMN "taskId" TEXT;

CREATE UNIQUE INDEX "action_items_taskId_key" ON "action_items"("taskId");

ALTER TABLE "action_items"
  ADD CONSTRAINT "action_items_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
