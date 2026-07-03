"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  href?: string;
  label?: string;
};

export function BackButton({ href, label = "Kembali" }: Props) {
  const router = useRouter();

  if (href) {
    return (
      <Link
        href={href}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 gap-1.5")}
      >
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 gap-1.5"
      onClick={() => router.back()}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
