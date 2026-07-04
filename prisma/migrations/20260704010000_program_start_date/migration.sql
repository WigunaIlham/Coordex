-- Program timeline needs a start date so the UI can compute time-based
-- auto-progress = (now - startDate) / (targetDate - startDate).
ALTER TABLE "programs"
  ADD COLUMN "startDate" TIMESTAMP(3);
