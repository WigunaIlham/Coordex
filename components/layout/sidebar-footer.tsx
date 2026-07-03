"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/generated/prisma/client";
import { getInitials } from "@/lib/utils";

type Props = {
  user: { name: string; email: string; avatarUrl?: string | null; role: Role };
};

export function SidebarFooter({ user }: Props) {
  return (
    <div className="border-t bg-background p-3">
      <div className="mb-2 flex items-center gap-3 rounded-md bg-muted/40 p-2">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {ROLE_LABELS[user.role]}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="mr-2 h-4 w-4" /> Keluar
      </Button>
    </div>
  );
}
