import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseNepalDateAndTime, parseNepalDateTime } from "@/lib/time";
import {
  sendBookingStatusEmail,
  sendContactAutoReply,
  sendContactNotification,
  sendEventBookingConfirmation,
  sendReservationConfirmation,
} from "@/lib/email";
import { writeAuditLog } from "@/lib/audit";
import { broadcastBookingUpdated } from "@/lib/realtime/broadcast";
import { pushNotificationService } from "./push-notification.service";
import type {
  ContactInput,
  EventBookingInput,
  ReservationInput,
} from "@/lib/validations";

export class BookingService {
  async createReservation(input: ReservationInput, userId?: string | null) {
    const dateTime = parseNepalDateAndTime(input.date, input.time);
    if (!dateTime) {
      throw new Error("Choose a valid date and time.");
    }

    const minTime = Date.now() + 60 * 60 * 1000;
    if (dateTime.getTime() < minTime) {
      throw new Error("Please book at least 1 hour in advance.");
    }

    const reservation = await prisma.$transaction(async (tx) => {
      const created = await tx.reservation.create({
        data: {
          userId: userId || null,
          name: input.name.trim(),
          email: input.email.toLowerCase().trim(),
          phone: input.phone.trim(),
          date: dateTime,
          guests: input.guests,
          occasion: input.occasion?.trim() || null,
          notes: input.notes?.trim() || null,
          status: "PENDING",
        },
      });

      await tx.notification.upsert({
        where: { eventKey: `reservation:${created.id}:created` },
        update: {},
        create: {
          eventKey: `reservation:${created.id}:created`,
          type: "RESERVATION",
          title: `New table request · ${created.guests} guests`,
          message: `${created.name} requested a table.`,
          link: "/admin/reservations",
        },
      });

      return created;
    });

    sendReservationConfirmation({
      name: reservation.name,
      email: reservation.email,
      date: reservation.date,
      guests: reservation.guests,
      status: reservation.status,
    }).catch(() => undefined);

    await writeAuditLog({
      userId: userId || undefined,
      actorEmail: reservation.email,
      action: "reservation.create",
      entity: "Reservation",
      entityId: reservation.id,
    });

    return reservation;
  }

  async listReservations(filters?: {
    userId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.ReservationWhereInput = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.status) where.status = filters.status;

    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.reservation.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async updateReservationStatus(
    id: string,
    status: string,
    tableNumber?: string | null,
    adminNotes?: string | null,
    actorEmail?: string | null,
  ) {
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new Error("Reservation not found.");

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status,
        ...(tableNumber !== undefined ? { tableNumber } : {}),
        adminNotes: adminNotes || null,
      },
    });

    if (status !== reservation.status) {
      sendBookingStatusEmail({
        kind: "reservation",
        name: reservation.name,
        email: reservation.email,
        status,
        date: reservation.date,
        guests: reservation.guests,
        notes: adminNotes || null,
      }).catch(() => undefined);
    }

    await writeAuditLog({
      actorEmail: actorEmail || undefined,
      action: "reservation.status_change",
      entity: "Reservation",
      entityId: id,
      details: JSON.stringify({ from: reservation.status, to: status }),
    });

    broadcastBookingUpdated({
      id: updated.id,
      kind: "reservation",
      status: updated.status,
      userId: reservation.userId,
    }).catch(() => undefined);

    pushNotificationService
      .sendReservationNotification({
        userId: reservation.userId,
        reservationId: reservation.id,
        status,
        date: reservation.date,
        tableNumber,
      })
      .catch(() => undefined);

    return updated;
  }

  async createEventBooking(input: EventBookingInput, userId?: string | null) {
    const eventDate = parseNepalDateTime(input.eventDate);
    if (!eventDate) {
      throw new Error("Choose a valid event date.");
    }

    const minDate = Date.now() + 24 * 60 * 60 * 1000;
    if (eventDate.getTime() < minDate) {
      throw new Error("Event bookings need at least 24 hours notice.");
    }

    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.eventBooking.create({
        data: {
          userId: userId || null,
          venueId: input.venueId || null,
          name: input.name.trim(),
          email: input.email.toLowerCase().trim(),
          phone: input.phone.trim(),
          eventType: input.eventType,
          eventDate,
          guests: input.guests,
          message: input.message?.trim() || null,
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
          title: `New event enquiry · ${created.eventType}`,
          message: `${created.name} enquired about ${created.venue?.name ?? "a venue"}.`,
          link: "/admin/event-bookings",
        },
      });

      return created;
    });

    sendEventBookingConfirmation({
      name: booking.name,
      email: booking.email,
      eventType: booking.eventType,
      eventDate: booking.eventDate,
      guests: booking.guests,
      status: booking.status,
    }).catch(() => undefined);

    await writeAuditLog({
      userId: userId || undefined,
      actorEmail: booking.email,
      action: "event_booking.create",
      entity: "EventBooking",
      entityId: booking.id,
    });

    return booking;
  }

  async listEventBookings(filters?: {
    userId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.EventBookingWhereInput = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.status) where.status = filters.status;

    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.eventBooking.findMany({
        where,
        include: { venue: true },
        orderBy: { eventDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.eventBooking.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async updateEventBookingStatus(
    id: string,
    status: string,
    adminNotes?: string | null,
    actorEmail?: string | null,
  ) {
    const booking = await prisma.eventBooking.findUnique({
      where: { id },
      include: { venue: true },
    });
    if (!booking) throw new Error("Event enquiry not found.");

    const updated = await prisma.eventBooking.update({
      where: { id },
      data: {
        status,
        adminNotes: adminNotes || null,
      },
    });

    if (status !== booking.status) {
      sendBookingStatusEmail({
        kind: "event",
        name: booking.name,
        email: booking.email,
        status,
        date: booking.eventDate,
        guests: booking.guests,
        notes: adminNotes || null,
        venue: booking.venue?.name,
      }).catch(() => undefined);
    }

    await writeAuditLog({
      actorEmail: actorEmail || undefined,
      action: "event.status_change",
      entity: "EventBooking",
      entityId: id,
      details: JSON.stringify({ from: booking.status, to: status }),
    });

    broadcastBookingUpdated({
      id: updated.id,
      kind: "event",
      status: updated.status,
      userId: booking.userId,
    }).catch(() => undefined);

    return updated;
  }

  async createContactMessage(input: ContactInput) {
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.contactMessage.create({
        data: {
          name: input.name.trim(),
          email: input.email.toLowerCase().trim(),
          phone: input.phone?.trim() || null,
          subject: input.subject.trim(),
          message: input.message.trim(),
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

    sendContactAutoReply(message.name, message.email).catch(() => undefined);
    sendContactNotification({
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

    return message;
  }
}

export const bookingService = new BookingService();
