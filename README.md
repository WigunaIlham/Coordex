# Coordex

Internal operations app untuk tim KKN Sisdamas — dashboard, tugas, rapat, keuangan, jadwal konsumsi, aktivitas, konflik, dokumen, dan lainnya.

## Stack

- **Next.js 16** (App Router + Turbopack)
- **React 19**
- **Prisma 7** + PostgreSQL (Supabase)
- **NextAuth v5** (credentials)
- **Tailwind CSS 4** + shadcn (Base UI)

## Setup lokal

```bash
# 1. Install
npm install

# 2. Copy env template dan isi
cp .env.example .env

# 3. Run migrations
npx prisma migrate deploy

# 4. Seed admin + akun tim
npm run db:seed              # buat SUPER_ADMIN
npx tsx scripts/seed-team.ts # buat 15 akun tim

# 5. Start dev
npm run dev
```

Buka http://localhost:3000

**Default login**:
- Admin: `admin@kkn.local` / `SuperAdmin2026!`
- Tim: `<slug>@kkn.jamalight` / `12345678`

Ganti password default segera setelah login pertama.

## Deploy ke Vercel

1. **Push repo** ke GitHub
2. Import di Vercel: `New Project` → pilih repo
3. **Environment variables** — set semua yang ada di `.env.example`:
   - `DATABASE_URL` (pooled connection, port 6543)
   - `DIRECT_URL` (direct connection, port 5432)
   - `NEXTAUTH_URL` (URL production Vercel-nya)
   - `NEXTAUTH_SECRET` + `AUTH_SECRET` (generate: `openssl rand -base64 32`)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. **Build command**: default (`next build`) — Prisma generate jalan via `postinstall`
5. **Migrations** — jalankan `npx prisma migrate deploy` sekali via lokal terhubung ke DB production, atau edit `build` script ke:
   ```json
   "build": "prisma migrate deploy && next build"
   ```
6. **Seed** — jalankan seed script sekali via lokal terhubung ke DB production

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — production server (setelah build)
- `npm run db:migrate` — dev migration
- `npm run db:deploy` — deploy migration ke production DB
- `npm run db:seed` — seed admin
- `npx tsx scripts/seed-team.ts` — seed 15 akun tim

## Struktur

- `app/` — App Router pages, layouts, API routes
- `components/` — UI components (shared + shadcn base)
- `lib/` — services, permissions, validators, generated Prisma client
- `prisma/` — schema + migrations + seed
- `scripts/` — one-off setup scripts
