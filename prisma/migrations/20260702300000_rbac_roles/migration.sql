-- RBAC overhaul: wipe users + related data, redefine Role enum.

-- Step 1: wipe users (cascade to all owned rows via FK).
TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;

-- Step 2: swap enum type. Postgres can't alter values in place, so temp-cast the
-- column to text, drop the old type, recreate with the new value set, then
-- cast back.
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE TEXT;
DROP TYPE "Role";
CREATE TYPE "Role" AS ENUM (
  'SUPER_ADMIN',
  'KETUA',
  'SEKRETARIS',
  'BENDAHARA',
  'PJ_PDD',
  'ANGGOTA_PDD',
  'PJ_KONSUMSI',
  'PJ_ACARA',
  'ANGGOTA_ACARA',
  'PJ_HUMLOG',
  'ANGGOTA_HUMLOG'
);
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING ("role"::"Role");
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ANGGOTA_HUMLOG';
