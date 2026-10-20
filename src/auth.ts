import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";

const googleEnabled =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse({
          email: credentials?.email,
          password: credentials?.password,
          remember: true,
        });
        if (!parsed.success) return null;

        const limit = await checkRateLimit(
          `login:${parsed.data.email}`,
          10,
          10 * 60 * 1000,
        );
        if (!limit.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.passwordHash || user.isBlocked) return null;
        if (!user.emailVerified) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          phone: user.phone,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      const existing = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
      });
      if (existing?.isBlocked) return false;
      if (account?.provider === "google" && existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            emailVerified: existing.emailVerified ?? new Date(),
            image: existing.image ?? user.image,
          },
        });
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "CUSTOMER";
        token.phone = user.phone ?? null;
        token.picture = user.image ?? null;
        token.sessionVersion = user.sessionVersion ?? 0;
      }
      if (trigger === "update") {
        const currentUser = token.id
          ? await prisma.user.findUnique({
              where: { id: String(token.id) },
              select: {
                name: true,
                image: true,
                role: true,
                phone: true,
                sessionVersion: true,
                isBlocked: true,
              },
            })
          : null;
        if (currentUser) {
          token.name = currentUser.name;
          token.picture = currentUser.image;
          token.role = currentUser.isBlocked ? "CUSTOMER" : currentUser.role;
          token.phone = currentUser.phone;
          token.sessionVersion = currentUser.sessionVersion;
        }
        if (session?.user) {
          if (typeof session.user.name === "string") {
            token.name = session.user.name;
          }
          if (typeof session.user.image === "string") {
            token.picture = session.user.image;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub ?? "");
        session.user.role = String(token.role ?? "CUSTOMER");
        session.user.phone = (token.phone as string | null) ?? null;
        session.user.image = (token.picture as string | null) ?? null;
        session.user.sessionVersion = Number(token.sessionVersion ?? 0);
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }
    },
  },
});

export const isGoogleAuthEnabled = googleEnabled;
