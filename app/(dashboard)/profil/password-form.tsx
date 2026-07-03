"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Password lama wajib diisi"),
    newPassword: z
      .string()
      .min(8, "Password baru minimal 8 karakter")
      .regex(/[A-Za-z]/, "Password baru harus mengandung huruf")
      .regex(/[0-9]/, "Password baru harus mengandung angka"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak cocok",
  });

type Input = z.infer<typeof schema>;

// Strength rules for real-time feedback.
const rules = [
  { key: "len", label: "Minimal 8 karakter", test: (v: string) => v.length >= 8 },
  { key: "letter", label: "Mengandung huruf", test: (v: string) => /[A-Za-z]/.test(v) },
  { key: "num", label: "Mengandung angka", test: (v: string) => /[0-9]/.test(v) },
];

export function PasswordForm() {
  const { update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const newPassword = watch("newPassword") ?? "";
  const confirmPassword = watch("confirmPassword") ?? "";
  const matchOk = confirmPassword.length > 0 && confirmPassword === newPassword;

  async function onSubmit(values: Input) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error?.message ?? "Gagal mengganti password");
        return;
      }
      await update({ isPasswordChanged: true });
      toast.success("Password berhasil diganti");
      reset();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">
          Password Lama <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            id="currentPassword"
            type={showCurrent ? "text" : "password"}
            autoComplete="current-password"
            disabled={isSubmitting}
            aria-invalid={!!errors.currentPassword}
            className="h-10 pr-10"
            {...register("currentPassword")}
          />
          <button
            type="button"
            onClick={() => setShowCurrent((s) => !s)}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={showCurrent ? "Sembunyikan" : "Tampilkan"}
            aria-pressed={showCurrent}
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.currentPassword && (
          <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">
            Password Baru <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              disabled={isSubmitting}
              aria-invalid={!!errors.newPassword}
              className="h-10 pr-10"
              {...register("newPassword")}
            />
            <button
              type="button"
              onClick={() => setShowNew((s) => !s)}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showNew ? "Sembunyikan" : "Tampilkan"}
              aria-pressed={showNew}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-xs text-destructive">{errors.newPassword.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">
            Konfirmasi <span className="text-destructive">*</span>
          </Label>
          <Input
            id="confirmPassword"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            disabled={isSubmitting}
            aria-invalid={!!errors.confirmPassword}
            className={cn(
              "h-10",
              matchOk && "border-emerald-400 ring-1 ring-emerald-400/40",
            )}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          ) : matchOk ? (
            <p className="flex items-center gap-1 text-xs text-emerald-600">
              <Check className="h-3 w-3" /> Password cocok
            </p>
          ) : null}
        </div>
      </div>

      {/* Live rule checklist */}
      <ul className="grid gap-1 rounded-lg border bg-muted/30 p-3 sm:grid-cols-3">
        {rules.map((rule) => {
          const ok = rule.test(newPassword);
          return (
            <li
              key={rule.key}
              className={cn(
                "flex items-center gap-1.5 text-[11px]",
                ok ? "text-emerald-700" : "text-muted-foreground",
              )}
            >
              {ok ? (
                <Check className="h-3 w-3 shrink-0" aria-hidden />
              ) : (
                <X className="h-3 w-3 shrink-0 opacity-40" aria-hidden />
              )}
              {rule.label}
            </li>
          );
        })}
      </ul>

      <div className="flex justify-end border-t pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Password Baru
        </Button>
      </div>
    </form>
  );
}
