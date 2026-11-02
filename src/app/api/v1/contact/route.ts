import { NextRequest } from "next/server";
import { bookingService } from "@/lib/services/booking.service";
import { contactSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  const ip = await getClientIp();
  const limit = await checkRateLimit(`api:contact:${ip}`, 5, 10 * 60 * 1000);
  if (!limit.success) {
    return jsonError("RATE_LIMIT_EXCEEDED", "Too many contact messages sent. Please wait.", 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  try {
    const message = await bookingService.createContactMessage(parsed.data);
    return jsonOk(
      {
        id: message.id,
        message: "Thank you for reaching out! We will contact you soon.",
      },
      undefined,
      201,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send message.";
    return jsonError("CONTACT_FAILED", msg, 400);
  }
}
