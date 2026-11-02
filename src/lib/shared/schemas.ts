import { z } from "zod";
export * from "@/lib/validations";

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, "Refresh token is required."),
});

export const pushTokenSchema = z.object({
  token: z.string().min(1, "Push token is required."),
  platform: z.enum(["ios", "android", "web"]).default("android"),
  deviceId: z.string().optional(),
});

export const mobileLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  deviceId: z.string().optional(),
});

export const socialAuthSchema = z.object({
  provider: z.enum(["google", "apple"]),
  idToken: z.string().min(10, "ID token is required."),
  name: z.string().optional(),
  email: z.string().email().optional(),
});

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  type: z.string().optional(),
  search: z.string().optional(),
});
