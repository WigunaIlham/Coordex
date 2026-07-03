"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Loader2, Plus, Search, ShieldCheck, Users2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { ROLE_LABELS, ROLE_OPTIONS } from "@/components/layout/role-label";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Role } from "@/lib/generated/prisma/client";
import { cn, getInitials } from "@/lib/utils";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  studentId: string | null;
  phone: string | null;
  isActive: boolean;
  isPasswordChanged: boolean;
  createdAt: string;
};

const createSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(120),
  email: z.string().email("Format email tidak valid"),
  role: z.enum([
    "SUPER_ADMIN",
    "KETUA",
    "SEKRETARIS",
    "BENDAHARA",
    "PJ_PDD",
    "ANGGOTA_PDD",
    "PJ_KONSUMSI",
    "PJ_ACARA",
    "ANGGOTA_ACARA",
    "PJ_HUMLOG",
    "ANGGOTA_HUMLOG",
  ]),
  studentId: z.string().max(40).optional(),
  phone: z.string().max(40).optional(),
});

type CreateInput = z.infer<typeof createSchema>;

export function UsersAdminClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [tempPasswordInfo, setTempPasswordInfo] = useState<
    | { name: string; email: string; password: string }
    | null
  >(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateInput>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "ANGGOTA_HUMLOG",
      studentId: "",
      phone: "",
    },
  });
  const watchedRole = watch("role");

  async function onCreate(values: CreateInput) {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal membuat akun");
      return;
    }
    const created = json.data as {
      user: { id: string; name: string; email: string; role: Role; isActive: boolean };
      temporaryPassword: string;
    };
    setUsers((prev) => [
      {
        ...created.user,
        studentId: values.studentId ?? null,
        phone: values.phone ?? null,
        isPasswordChanged: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setTempPasswordInfo({
      name: created.user.name,
      email: created.user.email,
      password: created.temporaryPassword,
    });
    setDialogOpen(false);
    reset();
    toast.success("Akun berhasil dibuat");
    router.refresh();
  }

  async function onToggleStatus(user: UserRow, next: boolean) {
    setPendingId(user.id);
    const res = await fetch(`/api/users/${user.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    const json = await res.json();
    setPendingId(null);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal mengubah status");
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isActive: next } : u))
    );
    toast.success(next ? "Akun diaktifkan" : "Akun dinonaktifkan");
  }

  async function onChangeRole(user: UserRow, role: Role) {
    setPendingId(user.id);
    const res = await fetch(`/api/users/${user.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const json = await res.json();
    setPendingId(null);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal mengubah peran");
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role } : u))
    );
    toast.success(`Peran diubah ke ${ROLE_LABELS[role]}`);
  }

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<Role | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE" | "NEW">("ALL");

  const visible = useMemo(() => {
    return users.filter((u) => {
      if (filterRole !== "ALL" && u.role !== filterRole) return false;
      if (filterStatus === "ACTIVE" && !u.isActive) return false;
      if (filterStatus === "INACTIVE" && u.isActive) return false;
      if (filterStatus === "NEW" && u.isPasswordChanged) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !u.name.toLowerCase().includes(q) &&
          !u.email.toLowerCase().includes(q) &&
          !(u.studentId ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [users, filterRole, filterStatus, search]);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const admins = users.filter((u) => u.role === "SUPER_ADMIN" || u.role === "KETUA").length;
    return { total: users.length, active, admins };
  }, [users]);

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      {users.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3">
          <StatChip icon={Users2} label="Total pengguna" value={stats.total} tone="slate" />
          <StatChip
            icon={Users2}
            label="Aktif"
            value={stats.active}
            tone="emerald"
          />
          <StatChip
            icon={ShieldCheck}
            label="Admin / Ketua"
            value={stats.admins}
            tone="blue"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, NIM…"
            className="h-9 pl-8"
            aria-label="Cari pengguna"
          />
        </div>
        <Select value={filterRole} onValueChange={(v) => v && setFilterRole(v as Role | "ALL")}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Peran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua peran</SelectItem>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterStatus}
          onValueChange={(v) => v && setFilterStatus(v as typeof filterStatus)}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua status</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="INACTIVE">Non-aktif</SelectItem>
            <SelectItem value="NEW">Belum login</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Tambah Anggota
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Tambah Anggota</DialogTitle>
              <DialogDescription>
                Sistem akan men-generate password sementara. Anggota wajib mengganti
                password lewat halaman Profil.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleSubmit(onCreate)}
              className="space-y-5"
              noValidate
            >
              {/* SECTION 1 · Identitas */}
              <fieldset className="space-y-3">
                <legend className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Identitas
                </legend>
                <div className="space-y-1.5">
                  <Label htmlFor="name">
                    Nama Lengkap <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    autoFocus
                    autoComplete="name"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.name}
                    className="h-10"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.email}
                    className="h-10"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Digunakan sebagai username login. Contoh: <code>nama@kkn.local</code>
                  </p>
                </div>
              </fieldset>

              {/* SECTION 2 · Peran & data opsional */}
              <fieldset className="space-y-3">
                <legend className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Peran & data tambahan
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>
                      Peran <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={watchedRole}
                      onValueChange={(value) => setValue("role", value as Role)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="studentId">NIM (opsional)</Label>
                    <Input
                      id="studentId"
                      autoComplete="off"
                      disabled={isSubmitting}
                      className="h-10"
                      {...register("studentId")}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Nomor HP (opsional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="08xxxxxxxxxx"
                    disabled={isSubmitting}
                    className="h-10"
                    {...register("phone")}
                  />
                </div>
              </fieldset>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Buat Akun
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Users2}
          title={users.length === 0 ? "Belum ada pengguna" : "Tidak ada pengguna cocok"}
          description={
            users.length === 0
              ? "Tambah anggota tim agar mereka bisa masuk ke sistem."
              : "Coba ubah kata kunci pencarian atau kombinasi filter."
          }
          action={
            users.length === 0 && (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Tambah Anggota Pertama
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-2 md:hidden">
            {visible.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <div
                  key={u.id}
                  className={cn(
                    "rounded-xl border bg-card p-3 transition-opacity",
                    !u.isActive && "opacity-60",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="text-xs">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        {isSelf && (
                          <Badge variant="secondary" className="text-[9px]">
                            Anda
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      {u.studentId && (
                        <p className="text-[11px] text-muted-foreground">
                          NIM {u.studentId}
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={u.isActive}
                      disabled={pendingId === u.id || isSelf}
                      onCheckedChange={(value) => onToggleStatus(u, value)}
                      aria-label="Aktif"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t pt-3">
                    <Select
                      value={u.role}
                      onValueChange={(value) => onChangeRole(u, value as Role)}
                      disabled={pendingId === u.id || isSelf}
                    >
                      <SelectTrigger className="h-8 flex-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {u.isPasswordChanged ? (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-300 bg-amber-50 text-[10px] text-amber-700"
                      >
                        Belum login
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border bg-background md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((u) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <TableRow
                      key={u.id}
                      className={cn(
                        "transition-opacity",
                        !u.isActive && "opacity-60",
                      )}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 border">
                            <AvatarFallback className="text-[10px]">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{u.name}</span>
                              {isSelf && (
                                <Badge variant="secondary" className="text-[9px]">
                                  Anda
                                </Badge>
                              )}
                            </div>
                            {u.studentId && (
                              <div className="text-xs text-muted-foreground">
                                NIM {u.studentId}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(value) => onChangeRole(u, value as Role)}
                          disabled={pendingId === u.id || isSelf}
                        >
                          <SelectTrigger className="h-8 w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {u.isPasswordChanged ? (
                          <Badge variant="secondary">Aktif</Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-50 text-amber-700"
                          >
                            Belum login
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={u.isActive}
                          disabled={pendingId === u.id || isSelf}
                          onCheckedChange={(value) => onToggleStatus(u, value)}
                          aria-label="Aktif"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={!!tempPasswordInfo} onOpenChange={(open) => !open && setTempPasswordInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Akun berhasil dibuat</DialogTitle>
            <DialogDescription>
              Salin kredensial berikut dan kirim ke anggota. Password ini hanya tampil sekali.
            </DialogDescription>
          </DialogHeader>
          {tempPasswordInfo && (
            <div className="space-y-3 rounded-md bg-muted p-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nama</p>
                <p className="font-medium">{tempPasswordInfo.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{tempPasswordInfo.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Password sementara</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="rounded bg-background px-2 py-1 font-mono text-base">
                    {tempPasswordInfo.password}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(tempPasswordInfo.password);
                      toast.success("Password disalin");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setTempPasswordInfo(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CHIP_TONES = {
  slate: "bg-slate-50 text-slate-700 ring-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
} as const;

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users2;
  label: string;
  value: number;
  tone: keyof typeof CHIP_TONES;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-inset",
        CHIP_TONES[tone],
      )}
    >
      <Icon className="h-4 w-4" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">
          {label}
        </p>
        <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  );
}
