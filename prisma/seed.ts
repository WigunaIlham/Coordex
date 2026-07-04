import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL must be set");
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Coordex database...");

  const adminEmail = "admin@kkn.local";
  const adminPassword = "SuperAdmin2026!";
  const hashed = await bcrypt.hash(adminPassword, 12);

  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: { role: "SUPER_ADMIN", isActive: true, password: hashed },
    create: {
      email: adminEmail,
      name: "Super Admin",
      password: hashed,
      role: "SUPER_ADMIN",
      isPasswordChanged: true,
      isActive: true,
    },
  });
  console.log(`  ✓ Super Admin: ${admin.email}`);

  console.log("✅ Seed selesai.");
  console.log(`\n   Login Super Admin: ${adminEmail}`);
  console.log(`   Password         : ${adminPassword}\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
