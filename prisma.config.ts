import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Prisma CLI (migrate, db push, seed via tsx) hits the session-mode pooler
  // because the transaction pooler (port 6543) does not support prepared
  // statements that Prisma's schema engine relies on.
  // Runtime Prisma Client still reads DATABASE_URL (transaction pooler) directly.
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
