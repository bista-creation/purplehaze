"use server";

import { revalidatePath } from "next/cache";
import { assertSameOrigin, getClientIp, getCurrentUser } from "@/lib/security";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  contactSchema,
  eventBookingSchema,
  reservationSchema,
  type ContactInput,
  type EventBookingInput,
  type ReservationInput,
} from "@/lib/validations";
import { bookingService } from "@/lib/services";

export type PublicActionResult = {
  success: boolean;
  message: string;
};

export async function submitContactAction(
  input: ContactInput,
): Promise<PublicActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please check your message.",
    };
  }

  try {
    await assertSameOrigin();
    const ip = await getClientIp();
    const limit = await checkRateLimit(`contact:${ip}`, 3, 10 * 60_000);
    if (!limit.success) {
      return {
        success: false,
        message: "Too many messages. Please wait a few minutes or call us.",
      };
    }

    await bookingService.createContactMessage(parsed.data);

    revalidatePath("/admin/messages");
    return {
      success: true,
      message:
        "Thank you — your message is with our team. We will reply during opening hours.",
    };
  } catch (error) {
    console.error("Contact form failed", error);
    return {
      success: false,
      message: "We couldn't send your message. Please call us instead.",
    };
  }
}

export async function submitReservationAction(
  input: ReservationInput,
): Promise<PublicActionResult> {
  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please check your request.",
    };
  }

  try {
    await assertSameOrigin();
    const ip = await getClientIp();
    const limit = await checkRateLimit(`reservation:${ip}`, 5, 60 * 60_000);
    if (!limit.success) {
      return {
        success: false,
        message: "Too many requests. Please wait a little and try again.",
      };
    }

    const user = await getCurrentUser();
    await bookingService.createReservation(parsed.data, user?.id);

    revalidatePath("/admin/reservations");
    revalidatePath("/account/bookings");
    return {
      success: true,
      message:
        "Your table request is in. Our team will contact you to confirm availability.",
    };
  } catch (error) {
    console.error("Reservation request failed", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "We couldn't send the reservation request. Please call us.",
    };
  }
}

export async function submitEventBookingAction(
  input: EventBookingInput,
): Promise<PublicActionResult> {
  const parsed = eventBookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please check your enquiry.",
    };
  }

  try {
    await assertSameOrigin();
    const ip = await getClientIp();
    const limit = await checkRateLimit(`event-enquiry:${ip}`, 3, 60 * 60_000);
    if (!limit.success) {
      return {
        success: false,
        message: "Too many enquiries. Please wait a little and try again.",
      };
    }

    const user = await getCurrentUser();
    await bookingService.createEventBooking(parsed.data, user?.id);

    revalidatePath("/admin/event-bookings");
    revalidatePath("/account/bookings");
    return {
      success: true,
      message:
        "Thank you — our events team will contact you to discuss availability and next steps.",
    };
  } catch (error) {
    console.error("Event enquiry failed", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "We couldn't send the enquiry. Please call our events team.",
    };
  }
}
