-- Add opensAt/closesAt window to stress surveys.

ALTER TABLE "stress_surveys"
  ADD COLUMN "opensAt" TIMESTAMP(3),
  ADD COLUMN "closesAt" TIMESTAMP(3);

-- Backfill existing surveys: default window = the day of surveyDate through +7 days.
UPDATE "stress_surveys"
  SET "opensAt" = "surveyDate",
      "closesAt" = "surveyDate" + INTERVAL '7 days'
  WHERE "opensAt" IS NULL;

ALTER TABLE "stress_surveys"
  ALTER COLUMN "opensAt" SET NOT NULL,
  ALTER COLUMN "closesAt" SET NOT NULL;
