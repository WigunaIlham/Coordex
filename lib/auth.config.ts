import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/lib/generated/prisma/client";

// Edge-safe config (no Node-only imports). Used in middleware.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
  providers: [], // Real providers attached in lib/auth.ts (Node runtime)
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isAuthRoute = pathname.startsWith("/login");
      const isPublicAsset =
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname === "/favicon.ico";

      if (isPublicAsset) return true;

      if (!isLoggedIn) {
        return isAuthRoute;
      }

      // Already logged in trying to visit /login → redirect to dashboard
      if (isAuthRoute) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isPasswordChanged = user.isPasswordChanged;
      }
      // Allow session.update() to refresh isPasswordChanged after change-password
      if (trigger === "update" && session?.isPasswordChanged !== undefined) {
        token.isPasswordChanged = session.isPasswordChanged;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.isPasswordChanged = token.isPasswordChanged as boolean;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
