-- Ganti modul Risiko + Pencapaian dengan QnA (diskusi tim).

-- Drop Risiko
DROP TABLE IF EXISTS "risks";
DROP TYPE IF EXISTS "RiskCategory";
DROP TYPE IF EXISTS "RiskLevel";
DROP TYPE IF EXISTS "RiskStatus";

-- Drop Pencapaian
DROP TABLE IF EXISTS "achievement_targets";
DROP TABLE IF EXISTS "achievements";
DROP TYPE IF EXISTS "AchievementType";

-- QnA — pertanyaan + jawaban terbuka.
CREATE TABLE "qna_questions" (
  "id"        TEXT NOT NULL,
  "title"     VARCHAR(300) NOT NULL,
  "body"      TEXT,
  "authorId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "qna_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "qna_questions_createdAt_idx" ON "qna_questions" ("createdAt");

ALTER TABLE "qna_questions"
  ADD CONSTRAINT "qna_questions_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "qna_answers" (
  "id"         TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "body"       TEXT NOT NULL,
  "authorId"   TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qna_answers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "qna_answers_questionId_idx" ON "qna_answers" ("questionId");

ALTER TABLE "qna_answers"
  ADD CONSTRAINT "qna_answers_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "qna_questions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "qna_answers"
  ADD CONSTRAINT "qna_answers_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
