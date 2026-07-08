import { KeyRound, Mail, Palette, PenLine, ShieldCheck, User } from "lucide-react";
import { redirect } from "next/navigation";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/generated/prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { AvatarUpload } from "./avatar-upload";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";
import { SignatureUpload } from "./signature-upload";
import { ThemeCard } from "./theme-card";

export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // signatureUrl mungkin belum tersedia di DB kalau migration terbaru belum
  // dijalankan (mis. build Vercel yang lolos tapi migrate deploy gagal).
  // Kita coba select dulu; kalau kolom belum ada, fallback tanpa signatureUrl
  // supaya halaman profil tetap bisa dibuka.
  let user: {
    name: string;
    email: string;
    phone: string | null;
    studentId: string | null;
    avatarUrl: string | null;
    signatureUrl: string | null;
    role: Role;
    isPasswordChanged: boolean;
    createdAt: Date;
  } | null = null;

  try {
    user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        phone: true,
        studentId: true,
        avatarUrl: true,
        signatureUrl: true,
        role: true,
        isPasswordChanged: true,
        createdAt: true,
      },
    });
  } catch (err) {
    console.warn(
      "[profil] select signatureUrl gagal, fallback tanpa TTD:",
      err instanceof Error ? err.message : err,
    );
    const fallback = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        phone: true,
        studentId: true,
        avatarUrl: true,
        role: true,
        isPasswordChanged: true,
        createdAt: true,
      },
    });
    if (fallback) user = { ...fallback, signatureUrl: null };
  }

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Profil"
        description="Kelola informasi akun dan keamanan Anda."
      />

      {/* Hero identity card */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border bg-card p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <AvatarUpload name={user.name} avatarUrl={user.avatarUrl} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold leading-tight sm:text-xl">
              {user.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                {ROLE_LABELS[user.role]}
              </Badge>
              {!user.isPasswordChanged && (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-700"
                >
                  Belum ganti password default
                </Badge>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" /> {user.email}
              </span>
              <span>Bergabung {formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-muted-foreground" />
              Informasi Pribadi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              defaults={{
                name: user.name,
                phone: user.phone ?? "",
                studentId: user.studentId ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PenLine className="h-4 w-4 text-muted-foreground" />
              Tanda Tangan Digital
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Unggah TTD sekali di sini — akan otomatis muncul di kolom Tanda
              Tangan pada dokumen yang membutuhkannya (mis. Daftar Hadir).
            </p>
          </CardHeader>
          <CardContent>
            <SignatureUpload signatureUrl={user.signatureUrl} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              Keamanan
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Gunakan password unik yang mengandung huruf dan angka, minimal 8 karakter.
            </p>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-muted-foreground" />
              Tampilan
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Pilih mode terang/gelap dan warna aksen sesuai preferensi Anda.
            </p>
          </CardHeader>
          <CardContent>
            <ThemeCard />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
