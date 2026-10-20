"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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
import { parseNepalDateAndTime } from "@/lib/time";
import {
  escapeHtml,
  sendAdminNotification,
  sendContactAutoReply,
  sendContactNotification,
  sendEventBookingConfirmation,
  sendReservationConfirmation,
} from "@/lib/email";
import { writeAuditLog } from "@/lib/audit";
import { formatDateTime } from "@/lib/utils";

export type PublicActionResult = {
  success: boolean;
  message: string;
};

const DAY = 86_400_000;

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

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.contactMessage.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          subject: parsed.data.subject,
          message: parsed.data.message,
        },
      });

      await tx.notification.upsert({
        where: { eventKey: `message:${created.id}:created` },
        update: {},
        create: {
          eventKey: `message:${created.id}:created`,
          type: "MESSAGE",
          title: "New website message",
          message: "Open the inbox to review the request.",
          link: "/admin/messages",
        },
      });

      return created;
    });

    after(async () => {
      await sendContactAutoReply(message.name, message.email).catch(
        () => undefined,
      );
      await sendContactNotification({
        name: message.name,
        email: message.email,
        phone: message.phone,
        subject: message.subject,
        message: message.message,
      }).catch(() => undefined);
      await writeAuditLog({
        actorEmail: message.email,
        action: "contact.submit",
        entity: "ContactMessage",
        entityId: message.id,
      });
    });

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

    const date = parseNepalDateAndTime(parsed.data.date, parsed.data.time);
    if (!date) {
      return { success: false, message: "Choose a valid date and time." };
    }
    if (date.getTime() < Date.now() + 30 * 60_000) {
      return {
        success: false,
        message: "Reservations need at least 30 minutes' notice.",
      };
    }
    if (date.getTime() > Date.now() + 90 * DAY) {
      return {
        success: false,
        message:
          "Please book within the next 90 days, or call us for later dates.",
      };
    }

    const user = await getCurrentUser();
    const reservation = await prisma.$transaction(async (tx) => {
      const created = await tx.reservation.create({
        data: {
          userId: user?.id,
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          date,
          guests: parsed.data.guests,
          occasion: parsed.data.occasion || null,
          notes: parsed.data.notes || null,
          status: "PENDING",
        },
      });

      await tx.notification.upsert({
        where: { eventKey: `reservation:${created.id}:created` },
        update: {},
        create: {
          eventKey: `reservation:${created.id}:created`,
          type: "RESERVATION",
          title: "New table request",
          message: `${created.guests} guests · ${formatDateTime(created.date)}`,
          link: "/admin/reservations",
        },
      });

      return created;
    });

    after(async () => {
      await sendReservationConfirmation({
        name: reservation.name,
        email: reservation.email,
        date: reservation.date,
        guests: reservation.guests,
        status: reservation.status,
      }).catch(() => undefined);
      await sendAdminNotification(
        `New reservation request — ${formatDateTime(date)}`,
        `<p style="font-size:14px;line-height:1.8;"><strong>${escapeHtml(
          reservation.name,
        )}</strong> · ${escapeHtml(reservation.phone)}</p>
        <p style="font-size:14px;line-height:1.8;">${reservation.guests} guests · ${escapeHtml(
          reservation.occasion ?? "No occasion given",
        )}</p>
        <p style="font-size:14px;line-height:1.8;">${escapeHtml(
          reservation.notes ?? "",
        )}</p>`,
        reservation.email,
      ).catch(() => undefined);
      await writeAuditLog({
        userId: user?.id,
        actorEmail: user?.email ?? reservation.email,
        action: "reservation.request",
        entity: "Reservation",
        entityId: reservation.id,
        details: { guests: reservation.guests, date: reservation.date },
      });
    });

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
      message: "We couldn't send the reservation request. Please call us.",
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

    const eventDate = parseNepalDateAndTime(parsed.data.eventDate, "12:00 PM");
    if (!eventDate) {
      return { success: false, message: "Choose a valid event date." };
    }
    if (eventDate.getTime() < Date.now()) {
      return { success: false, message: "Choose a future event date." };
    }
    if (eventDate.getTime() > Date.now() + 548 * DAY) {
      return {
        success: false,
        message:
          "Please contact us directly for events more than 18 months away.",
      };
    }

    let venueId: string | null = null;
    if (parsed.data.venueId) {
      const venue = await prisma.venue.findFirst({
        where: { id: parsed.data.venueId, isActive: true },
        select: { id: true },
      });
      if (!venue) {
        return {
          success: false,
          message: "That venue is unavailable. Choose another or ask us.",
        };
      }
      venueId = venue.id;
    }

    const user = await getCurrentUser();
    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.eventBooking.create({
        data: {
          userId: user?.id,
          venueId,
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          eventType: parsed.data.eventType,
          eventDate,
          guests: parsed.data.guests,
          message: parsed.data.message || null,
          status: "PENDING",
        },
        include: { venue: true },
      });

      await tx.notification.upsert({
        where: { eventKey: `event:${created.id}:created` },
        update: {},
        create: {
          eventKey: `event:${created.id}:created`,
          type: "EVENT",
          title: "New event enquiry",
          message: `${created.eventType} · ${created.guests} guests · ${formatDateTime(created.eventDate)}`,
          link: "/admin/event-bookings",
        },
      });

      return created;
    });

    after(async () => {
      await sendEventBookingConfirmation({
        name: booking.name,
        email: booking.email,
        eventDate: booking.eventDate,
        guests: booking.guests,
        eventType: booking.eventType,
        status: booking.status,
      }).catch(() => undefined);
      await sendAdminNotification(
        `New event enquiry — ${booking.eventType}`,
        `<p style="font-size:14px;line-height:1.8;"><strong>${escapeHtml(
          booking.name,
        )}</strong> · ${escapeHtml(booking.phone)} · ${escapeHtml(
          booking.email,
        )}</p>
        <p style="font-size:14px;line-height:1.8;">${escapeHtml(
          booking.venue?.name ?? "Venue not selected",
        )} · ${booking.guests} guests · ${formatDateTime(booking.eventDate)}</p>
        <p style="font-size:14px;line-height:1.8;white-space:pre-wrap;">${escapeHtml(
          booking.message ?? "",
        )}</p>`,
        booking.email,
      ).catch(() => undefined);
      await writeAuditLog({
        userId: user?.id,
        actorEmail: user?.email ?? booking.email,
        action: "event.enquiry",
        entity: "EventBooking",
        entityId: booking.id,
        details: {
          eventType: booking.eventType,
          guests: booking.guests,
          venueId,
        },
      });
    });

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
      message: "We couldn't send the enquiry. Please call our events team.",
    };
  }
}
