"use server";

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  actionErrorMessage,
  adminActionUser,
  auditAction,
  refreshAdmin,
  staffActionUser,
} from "@/lib/admin";
import { bookingStatusSchema, type BookingStatusInput } from "@/lib/validations";
import { sendBookingStatusEmail } from "@/lib/email";
import type { AdminActionResult } from "@/actions/admin/orders";

export async function updateReservationStatusAction(
  input: BookingStatusInput,
): Promise<AdminActionResult> {
  const parsed = bookingStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Choose a valid reservation status." };
  }
  try {
    const user = await staffActionUser();
    const reservation = await prisma.reservation.findUnique({
      where: { id: parsed.data.id },
    });
    if (!reservation) return { success: false, message: "Reservation not found." };

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: parsed.data.status,
        adminNotes: parsed.data.adminNotes || null,
      },
    });
    await auditAction(
      user,
      "reservation.status.change",
      "Reservation",
      reservation.id,
      { from: reservation.status, to: parsed.data.status },
    );

    if (parsed.data.status !== reservation.status) {
      after(async () => {
        await sendBookingStatusEmail({
          kind: "reservation",
          name: reservation.name,
          email: reservation.email,
          status: parsed.data.status,
          date: reservation.date,
          guests: reservation.guests,
          notes: parsed.data.adminNotes || null,
        }).catch(() => undefined);
      });
    }

    refreshAdmin("/admin/reservations", "/account/bookings");
    return {
      success: true,
      message: `Reservation marked ${parsed.data.status.toLowerCase()}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't update the reservation."),
    };
  }
}

export async function updateEventBookingStatusAction(
  input: BookingStatusInput,
): Promise<AdminActionResult> {
  const parsed = bookingStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Choose a valid booking status." };
  }
  try {
    const user = await staffActionUser();
    const booking = await prisma.eventBooking.findUnique({
      where: { id: parsed.data.id },
      include: { venue: true },
    });
    if (!booking) return { success: false, message: "Event enquiry not found." };

    await prisma.eventBooking.update({
      where: { id: booking.id },
      data: {
        status: parsed.data.status,
        adminNotes: parsed.data.adminNotes || null,
      },
    });
    await auditAction(
      user,
      "event.status.change",
      "EventBooking",
      booking.id,
      { from: booking.status, to: parsed.data.status },
    );

    if (parsed.data.status !== booking.status) {
      after(async () => {
        await sendBookingStatusEmail({
          kind: "event",
          name: booking.name,
          email: booking.email,
          status: parsed.data.status,
          date: booking.eventDate,
          guests: booking.guests,
          venue: booking.venue?.name ?? null,
          reference: booking.eventType,
          notes: parsed.data.adminNotes || null,
        }).catch(() => undefined);
      });
    }

    refreshAdmin("/admin/event-bookings", "/account/bookings");
    return {
      success: true,
      message: `Event booking marked ${parsed.data.status.toLowerCase()}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't update the event booking."),
    };
  }
}

export async function deleteReservationAction(
  id: string,
): Promise<AdminActionResult> {
  try {
    const user = await adminActionUser();
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) return { success: false, message: "Reservation not found." };
    await prisma.reservation.delete({ where: { id } });
    await auditAction(user, "reservation.delete", "Reservation", id, {
      name: reservation.name,
      date: reservation.date.toISOString(),
    });
    refreshAdmin("/admin/reservations", "/account/bookings");
    return { success: true, message: "Reservation deleted." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't delete the reservation."),
    };
  }
}

export async function deleteEventBookingAction(
  id: string,
): Promise<AdminActionResult> {
  try {
    const user = await adminActionUser();
    const booking = await prisma.eventBooking.findUnique({ where: { id } });
    if (!booking) return { success: false, message: "Event enquiry not found." };
    await prisma.eventBooking.delete({ where: { id } });
    await auditAction(user, "event.delete", "EventBooking", id, {
      name: booking.name,
      date: booking.eventDate.toISOString(),
    });
    refreshAdmin("/admin/event-bookings", "/account/bookings");
    return { success: true, message: "Event enquiry deleted." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't delete the event enquiry."),
    };
  }
}
