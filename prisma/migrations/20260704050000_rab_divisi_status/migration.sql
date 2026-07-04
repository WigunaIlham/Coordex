-- RAB dapat tag divisi + status (DRAFT/REVISI/FIX) supaya tim tahu mana
-- yang final vs masih editing.

CREATE TYPE "RabStatus" AS ENUM ('DRAFT', 'REVISI', 'FIX');

ALTER TABLE "rabs"
  ADD COLUMN "divisi" "DivisiTag" NOT NULL DEFAULT 'UMUM',
  ADD COLUMN "status" "RabStatus" NOT NULL DEFAULT 'DRAFT';

CREATE INDEX "rabs_divisi_idx" ON "rabs" ("divisi");
CREATE INDEX "rabs_status_idx" ON "rabs" ("status");
