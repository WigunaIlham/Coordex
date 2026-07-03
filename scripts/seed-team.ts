import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "../lib/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL must be set");

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

type SeedMember = { name: string; role: Role; slug: string };

const DOMAIN = "kkn.jamalight";

// Short unique slugs — one word each, no dots.
const MEMBERS: SeedMember[] = [
  { name: "Alvino", role: "KETUA", slug: "alvino" },
  { name: "Muhammad Wiguna Ilham", role: "SEKRETARIS", slug: "wiguna" },
  { name: "Siti Rahma Azzahhra", role: "BENDAHARA", slug: "rahma" },
  { name: "Firmansah", role: "PJ_PDD", slug: "firmansah" },
  { name: "Hafidzah Al-Usroh Bil Jannah", role: "ANGGOTA_PDD", slug: "hafidzah" },
  { name: "M. Aidil AlKautsar", role: "ANGGOTA_PDD", slug: "aidil" },
  { name: "Siti Aneu Pratiwi Citra Lestari", role: "ANGGOTA_PDD", slug: "aneu" },
  { name: "Muhammad Zaenudin Sidiq", role: "PJ_ACARA", slug: "zaenudin" },
  { name: "Hamdi Arif Ihsanudin", role: "ANGGOTA_ACARA", slug: "hamdi" },
  { name: "Ochy Caramoy", role: "ANGGOTA_ACARA", slug: "ochy" },
  { name: "Siti Annisa Fadhillah", role: "ANGGOTA_ACARA", slug: "annisa" },
  { name: "Muhammad Hidayatuloh", role: "PJ_HUMLOG", slug: "hidayat" },
  { name: "Andri Al-Gian Ginanjar", role: "ANGGOTA_HUMLOG", slug: "andri" },
  { name: "Gading Aulia Zahwa", role: "ANGGOTA_HUMLOG", slug: "gading" },
  { name: "Maftahul Hasyim", role: "ANGGOTA_HUMLOG", slug: "maftah" },
];

async function main() {
  const password = "12345678";
  const hash = await bcrypt.hash(password, 12);

  console.log(`Seeding ${MEMBERS.length} team members with password "${password}" @ ${DOMAIN}…\n`);

  // Match existing team members by name (any prior email/domain) and rewrite
  // them to the new short email. New records get created if no name match.
  const targetEmails = new Set<string>();
  for (const m of MEMBERS) {
    const email = `${m.slug}@${DOMAIN}`;
    targetEmails.add(email);

    const existing = await db.user.findFirst({ where: { name: m.name } });
    if (existing) {
      const updated = await db.user.update({
        where: { id: existing.id },
        data: {
          email,
          name: m.name,
          role: m.role,
          password: hash,
          isActive: true,
        },
        select: { role: true, email: true, name: true },
      });
      console.log(`  ↻ ${updated.role.padEnd(16)} ${updated.email.padEnd(28)} ${updated.name}`);
    } else {
      const created = await db.user.create({
        data: {
          email,
          name: m.name,
          role: m.role,
          password: hash,
          isActive: true,
        },
        select: { role: true, email: true, name: true },
      });
      console.log(`  + ${created.role.padEnd(16)} ${created.email.padEnd(28)} ${created.name}`);
    }
  }

  // Clean up any stray team accounts left over from previous long-email seed.
  const stale = await db.user.findMany({
    where: {
      role: { not: "SUPER_ADMIN" },
      email: { notIn: Array.from(targetEmails) },
    },
    select: { id: true, email: true, name: true },
  });
  if (stale.length > 0) {
    console.log(`\nCleaning up ${stale.length} stale account(s):`);
    for (const s of stale) console.log(`  - ${s.email} (${s.name})`);
    await db.user.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  }

  console.log(`\nDone. Login pattern: <slug>@${DOMAIN} · password ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
