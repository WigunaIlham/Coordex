import type { Role } from "@/lib/generated/prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      isPasswordChanged: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    isPasswordChanged: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    isPasswordChanged: boolean;
  }
}
