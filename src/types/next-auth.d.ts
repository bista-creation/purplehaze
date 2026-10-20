import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      phone?: string | null;
      sessionVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    phone?: string | null;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    phone?: string | null;
    sessionVersion?: number;
  }
}
