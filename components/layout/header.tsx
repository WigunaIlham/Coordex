"use client";

import { LogOut, Menu, User } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

import { SidebarFooter } from "@/components/layout/sidebar-footer";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ROLE_LABELS } from "@/components/layout/role-label";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Role } from "@/lib/generated/prisma/client";
import { getInitials } from "@/lib/utils";

type Props = {
  user: { name: string; email: string; avatarUrl?: string | null; role: Role };
  unresolvedConflicts?: number;
};

export function Header({ user, unresolvedConflicts }: Props) {
  // Mobile navigation lives in BottomNav; only render the sheet fallback on
  // small viewports if it's actually needed (kept for a11y — a user without
  // fine-touch pointers can still reach a menu via the header button).
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-6"
    >
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="flex w-52 max-w-[45vw] flex-col p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-left">Coordex</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav
              role={user.role}
              unresolvedConflicts={unresolvedConflicts}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
          <SidebarFooter user={user} />
        </SheetContent>
      </Sheet>

      <Link
        href="/dashboard"
        className="flex items-center gap-2 font-semibold md:hidden"
        aria-label="Dashboard"
      >
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
          C
        </span>
        <span>Coordex</span>
      </Link>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <ThemeSwitcher />
        <div className="hidden text-right text-xs leading-tight md:block">
          <p className="font-medium">{user.name}</p>
          <p className="text-muted-foreground">{ROLE_LABELS[user.role]}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Menu pengguna</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            {/* Base UI requires GroupLabel inside a <Group>. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col">
                <span>{user.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={
                <Link href="/profil" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" /> Profil
                </Link>
              }
            />
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
