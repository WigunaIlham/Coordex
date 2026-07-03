-- Introduce 3-state ActionItemStatus and migrate isCompleted data.

-- CreateEnum
CREATE TYPE "ActionItemStatus" AS ENUM ('BELUM', 'PROGRESS', 'SELESAI');

-- AlterTable: add nullable column, backfill, then set NOT NULL + default.
ALTER TABLE "action_items"
  ADD COLUMN "status" "ActionItemStatus";

UPDATE "action_items"
  SET "status" = CASE WHEN "isCompleted" = true THEN 'SELESAI'::"ActionItemStatus" ELSE 'BELUM'::"ActionItemStatus" END;

ALTER TABLE "action_items"
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'BELUM';

-- Drop the deprecated boolean.
ALTER TABLE "action_items" DROP COLUMN "isCompleted";
