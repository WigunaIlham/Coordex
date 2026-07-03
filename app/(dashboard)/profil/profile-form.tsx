"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(120),
  phone: z.string().max(40).optional(),
  studentId: z.string().max(40).optional(),
});

type Input = z.infer<typeof schema>;

type Props = {
  defaults: { name: string; phone: string; studentId: string };
};

export function ProfileForm({ defaults }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  async function onSubmit(values: Input) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error?.message ?? "Gagal menyimpan");
        return;
      }
      toast.success("Profil tersimpan");
      reset(values);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">
          Nama Lengkap <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Nomor HP</Label>
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
        <div className="space-y-1.5">
          <Label htmlFor="studentId">NIM</Label>
          <Input
            id="studentId"
            autoComplete="off"
            disabled={isSubmitting}
            className="h-10"
            {...register("studentId")}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t pt-4">
        {isDirty && (
          <span className="mr-auto text-xs text-muted-foreground">
            Ada perubahan belum disimpan
          </span>
        )}
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Perubahan
        </Button>
      </div>
    </form>
  );
}
