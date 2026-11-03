import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth-context";
import { profileSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in to view your profile.", 401);
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      image: true,
      createdAt: true,
    },
  });

  if (!profile) {
    return jsonError("NOT_FOUND", "User not found.", 404);
  }

  return jsonOk(profile);
}

export async function PUT(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in to update your profile.", 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      image: true,
      createdAt: true,
    },
  });

  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: "account.profile.update",
    entity: "User",
    entityId: user.id,
    details: { changes: parsed.data },
  });

  return jsonOk(updated);
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthContext(req);
  if (!user) {
    return jsonError("UNAUTHORIZED", "Please sign in to delete your account.", 401);
  }

  // Pre-fetch user's orders to link to payment scrubbing
  const userOrders = await prisma.order.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const orderIds = userOrders.map((o) => o.id);

  // Execute account deletion batch:
  // 1. Revoke all refresh tokens, sessions, accounts
  // 2. Delete push tokens, saved addresses, favorites, notifications
  // 3. Delete personal reviews and contact messages
  // 4. Anonymize reservations and event bookings
  // 5. Scrub retained orders: customerName, email, phone, deliveryAddress, free-text order notes, cancelReason
  // 6. Scrub order item free-text special instructions
  // 7. Scrub payments (keep only transactionId, provider, and amount for accounting)
  // 8. Scrub historical audit log entries (anonymize email, IP, details)
  // 9. Delete user account
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    prisma.pushToken.deleteMany({ where: { userId: user.id } }),
    prisma.favorite.deleteMany({ where: { userId: user.id } }),
    prisma.address.deleteMany({ where: { userId: user.id } }),
    prisma.review.deleteMany({ where: { userId: user.id } }),
    prisma.contactMessage.deleteMany({ where: { email: user.email } }),
    prisma.reservation.updateMany({
      where: { OR: [{ userId: user.id }, { email: user.email }] },
      data: {
        userId: null,
        name: "Deleted User",
        email: "deleted@customer.local",
        phone: "0000000000",
        notes: null,
        occasion: null,
      },
    }),
    prisma.eventBooking.updateMany({
      where: { OR: [{ userId: user.id }, { email: user.email }] },
      data: {
        userId: null,
        name: "Deleted User",
        email: "deleted@customer.local",
        phone: "0000000000",
        message: null,
      },
    }),
    ...(orderIds.length > 0
      ? [
          prisma.payment.updateMany({
            where: { orderId: { in: orderIds } },
            data: { payload: null },
          }),
          prisma.orderItem.updateMany({
            where: { orderId: { in: orderIds } },
            data: { instructions: null },
          }),
        ]
      : []),
    prisma.order.updateMany({
      where: { userId: user.id },
      data: {
        userId: null,
        customerName: "Deleted User",
        customerEmail: "deleted@customer.local",
        customerPhone: "0000000000",
        deliveryAddress: "[Scrubbed upon account deletion]",
        notes: null,
        cancelReason: null,
      },
    }),
    prisma.auditLog.updateMany({
      where: {
        OR: [{ userId: user.id }, { actorEmail: user.email }],
      },
      data: {
        userId: null,
        actorEmail: "deleted@customer.local",
        ip: "0.0.0.0",
        details: "[Scrubbed upon account deletion]",
      },
    }),
    prisma.notificationRead.deleteMany({ where: { userId: user.id } }),
    prisma.notification.deleteMany({ where: { userId: user.id } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.account.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  await writeAuditLog({
    userId: null,
    actorEmail: "deleted@customer.local",
    action: "account.profile.delete",
    entity: "User",
    entityId: user.id,
    ip: "0.0.0.0",
    details: { reason: "User requested account deletion" },
  });

  return jsonOk({
    message: "Your account and all associated personal data have been deleted and anonymized.",
  });
}
