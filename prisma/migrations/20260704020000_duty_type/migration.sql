-- Distinguish konsumsi vs piket dalam struktur duty yang sama.

CREATE TYPE "DutyType" AS ENUM ('KONSUMSI', 'PIKET');

ALTER TABLE "consumption_duties"
  ADD COLUMN "type" "DutyType" NOT NULL DEFAULT 'KONSUMSI';

-- Ganti unique constraint dari (date) ke (date, type) supaya KONSUMSI + PIKET
-- bisa hidup di hari yang sama.
ALTER TABLE "consumption_duties" DROP CONSTRAINT IF EXISTS "consumption_duties_date_key";

ALTER TABLE "consumption_duties"
  ADD CONSTRAINT "consumption_duties_date_type_key" UNIQUE ("date", "type");

CREATE INDEX "consumption_duties_type_idx" ON "consumption_duties" ("type");
