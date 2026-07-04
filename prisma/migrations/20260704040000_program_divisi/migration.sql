-- Program mendapatkan tag divisi eksplisit — sebelumnya divisi ditebak dari
-- role PIC, yang salah kalau (misal) Ketua jadi PIC program Acara.

CREATE TYPE "DivisiTag" AS ENUM ('UMUM', 'PDD', 'ACARA', 'HUMLOG', 'KONSUMSI');

ALTER TABLE "programs"
  ADD COLUMN "divisi" "DivisiTag" NOT NULL DEFAULT 'UMUM';

CREATE INDEX "programs_divisi_idx" ON "programs" ("divisi");
