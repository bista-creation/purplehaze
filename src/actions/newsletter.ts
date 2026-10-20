"use server";

import { prisma } from "@/lib/prisma";
import { newsletterSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";

export type NewsletterState = {
  success: boolean;
  message: string;
};

export async function subscribeNewsletterAction(
  _prevState: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Enter a valid email.",
    };
  }

  const ip = await getClientIp();
  const limit = await checkRateLimit(`newsletter:${ip}`, 5, 60_000);
  if (!limit.success) {
    return {
      success: false,
      message: "Too many attempts. Please try again in a minute.",
    };
  }

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.email },
      create: { email: parsed.data.email },
      update: { isActive: true },
    });
    return {
      success: true,
      message: "You're on the list. Watch out for something delicious.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't subscribe you right now. Please try again later.",
    };
  }
}
