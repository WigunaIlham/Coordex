-- Remove Action Items feature entirely (schema + data).
-- Users chose to delete both feature and historical data.

DROP TABLE IF EXISTS "action_items";
DROP TYPE IF EXISTS "ActionItemStatus";
