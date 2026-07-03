-- Performance: fill in the covering indexes for our hottest single-column
-- filters. Postgres composite primary/unique keys only cover the first column,
-- so filters on the second column fall back to a sequential scan without an
-- explicit index.

CREATE INDEX IF NOT EXISTS "task_assignees_userId_idx" ON "task_assignees"("userId");
CREATE INDEX IF NOT EXISTS "stress_responses_userId_idx" ON "stress_responses"("userId");
CREATE INDEX IF NOT EXISTS "conflict_reports_reporterId_idx" ON "conflict_reports"("reporterId");
