import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "@/lib/auth.config";
import { db } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        try {
          const parsed = credentialsSchema.safeParse(raw);
          if (!parsed.success) return null;

          const { email, password } = parsed.data;
          const user = await db.user.findUnique({
            where: { email: email.toLowerCase() },
          });

          if (!user || !user.isActive) return null;

          const valid = await bcrypt.compare(password, user.password);
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatarUrl ?? null,
            role: user.role,
            isPasswordChanged: user.isPasswordChanged,
          };
        } catch (err) {
          // Surface the real error to Vercel Function Logs — Auth.js swallows
          // it into a generic "Configuration" error on the client otherwise.
          console.error("[auth.authorize] error:", err);
          throw err;
        }
      },
    }),
  ],
});
