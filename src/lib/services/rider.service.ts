import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { encryptPii, decryptPii } from "@/lib/security/encryption";
import { writeAuditLog } from "@/lib/audit";

export class ServiceError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export type ServiceResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: ServiceError; data?: never };

export interface RiderAdminDetails {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    isBlocked: boolean;
    createdAt: Date;
  };
  vehicleType: string;
  plateNumber: string | null;
  licenseNumber: string | null;
  licenseStatus: string;
  licenseVerifiedAt: Date | null;
  licenseExpiresAt: Date | null;
  shiftStatus: string;
  mustChangePassword: boolean;
  lastActiveAt: Date | null;
}

export interface RiderActiveOrder {
  deliveryId: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  customerLat: number | null;
  customerLng: number | null;
  deliveryStatus: string;
  orderStatus: string;
  totalPaisa: number;
  codAmountPaisa: number;
  paymentMethod: string;
  paymentStatus: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  assignedAt: Date;
  acceptedAt: Date | null;
  pickedUpAt: Date | null;
}

export interface CreateRiderInput {
  name: string;
  email: string;
  phone: string;
  vehicleType?: string;
  plateNumber?: string;
  licenseNumber?: string;
  licenseExpiresAt?: Date;
  temporaryPassword?: string;
}

export const riderService = {
  /**
   * Admin-only rider provisioning
   */
  async createRider(
    input: CreateRiderInput,
    adminUser: { id: string; email: string }
  ): Promise<ServiceResult<{ riderId: string; email: string; temporaryPassword: string }>> {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email.toLowerCase() }, { phone: input.phone }],
      },
    });

    if (existing) {
      return {
        success: false,
        error: new ServiceError("USER_EXISTS", "A user with this email or phone already exists.", 409),
      };
    }

    const tempPassword = input.temporaryPassword || `Rider@${Math.floor(100000 + Math.random() * 900000)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        passwordHash,
        role: "RIDER",
        emailVerified: new Date(),
        sessionVersion: 0,
        isBlocked: false,
      },
    });

    const encryptedPlate = input.plateNumber ? encryptPii(input.plateNumber) : null;
    const encryptedLicense = input.licenseNumber ? encryptPii(input.licenseNumber) : null;

    const profile = await prisma.riderProfile.create({
      data: {
        userId: user.id,
        vehicleType: input.vehicleType || "MOTORCYCLE",
        encryptedPlateNumber: encryptedPlate,
        encryptedLicenseNo: encryptedLicense,
        licenseStatus: "PENDING",
        licenseExpiresAt: input.licenseExpiresAt,
        mustChangePassword: true,
      },
    });

    await writeAuditLog({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: "rider.create",
      entity: "RiderProfile",
      entityId: profile.id,
      details: {
        riderEmail: user.email,
        vehicleType: profile.vehicleType,
        licenseStatus: "PENDING",
      },
    });

    return {
      success: true,
      data: {
        riderId: profile.id,
        email: user.email,
        temporaryPassword: tempPassword,
      },
    };
  },

  /**
   * Admin-only license verification & expiry management
   */
  async verifyLicense(
    riderProfileId: string,
    status: "VERIFIED" | "REJECTED",
    adminUser: { id: string; email: string },
    expiresAt?: Date
  ): Promise<ServiceResult<{ id: string; licenseStatus: string }>> {
    const rider = await prisma.riderProfile.findUnique({
      where: { id: riderProfileId },
      include: { user: true },
    });

    if (!rider) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Rider profile not found.", 404),
      };
    }

    const updated = await prisma.riderProfile.update({
      where: { id: riderProfileId },
      data: {
        licenseStatus: status,
        licenseVerifiedAt: status === "VERIFIED" ? new Date() : null,
        ...(expiresAt !== undefined ? { licenseExpiresAt: expiresAt } : {}),
      },
      select: { id: true, licenseStatus: true },
    });

    await writeAuditLog({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: "rider.license_verify",
      entity: "RiderProfile",
      entityId: riderProfileId,
      details: {
        riderEmail: rider.user.email,
        newStatus: status,
        expiresAt: expiresAt?.toISOString() || null,
      },
    });

    return { success: true, data: updated };
  },

  /**
   * Admin-only view rider profile with decrypted PII & audit logging
   */
  async getRiderAdminDetails(
    riderProfileId: string,
    adminUser: { id: string; email: string }
  ): Promise<ServiceResult<RiderAdminDetails>> {
    const rider = await prisma.riderProfile.findUnique({
      where: { id: riderProfileId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isBlocked: true,
            createdAt: true,
          },
        },
      },
    });

    if (!rider) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Rider not found.", 404),
      };
    }

    const decryptedPlate = decryptPii(rider.encryptedPlateNumber);
    const decryptedLicense = decryptPii(rider.encryptedLicenseNo);

    await writeAuditLog({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: "rider.pii.decrypt",
      entity: "RiderProfile",
      entityId: riderProfileId,
      details: {
        riderEmail: rider.user.email,
      },
    });

    return {
      success: true,
      data: {
        id: rider.id,
        user: rider.user,
        vehicleType: rider.vehicleType,
        plateNumber: decryptedPlate,
        licenseNumber: decryptedLicense,
        licenseStatus: rider.licenseStatus,
        licenseVerifiedAt: rider.licenseVerifiedAt,
        licenseExpiresAt: rider.licenseExpiresAt,
        shiftStatus: rider.shiftStatus,
        mustChangePassword: rider.mustChangePassword,
        lastActiveAt: rider.lastActiveAt,
      },
    };
  },

  /**
   * Block or unblock a rider with instant session revocation
   */
  async setRiderBlockedStatus(
    riderProfileId: string,
    isBlocked: boolean,
    adminUser: { id: string; email: string }
  ): Promise<ServiceResult<{ success: boolean; isBlocked: boolean }>> {
    const rider = await prisma.riderProfile.findUnique({
      where: { id: riderProfileId },
      include: { user: true },
    });

    if (!rider) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Rider not found.", 404),
      };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: rider.userId },
        data: {
          isBlocked,
          sessionVersion: { increment: 1 },
        },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: rider.userId },
      }),
      prisma.pushToken.deleteMany({
        where: { userId: rider.userId },
      }),
      ...(isBlocked
        ? [
            prisma.riderProfile.update({
              where: { id: riderProfileId },
              data: { shiftStatus: "OFF_DUTY" },
            }),
          ]
        : []),
    ]);

    await writeAuditLog({
      userId: adminUser.id,
      actorEmail: adminUser.email,
      action: isBlocked ? "rider.block" : "rider.unblock",
      entity: "RiderProfile",
      entityId: riderProfileId,
      details: {
        riderEmail: rider.user.email,
        sessionRevoked: true,
      },
    });

    return { success: true, data: { success: true, isBlocked } };
  },

  /**
   * Mandatory first-login password change for riders
   */
  async firstLoginChangePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<ServiceResult<{ success: boolean }>> {
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: new ServiceError("INVALID_PASSWORD", "Password must be at least 8 characters.", 422),
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { riderProfile: true },
    });

    if (!user || user.role !== "RIDER" || !user.passwordHash) {
      return {
        success: false,
        error: new ServiceError("UNAUTHORIZED", "Invalid rider account.", 401),
      };
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return {
        success: false,
        error: new ServiceError("INVALID_CREDENTIALS", "Current password is incorrect.", 400),
      };
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newHash,
          sessionVersion: { increment: 1 },
        },
      }),
      prisma.riderProfile.update({
        where: { userId },
        data: { mustChangePassword: false },
      }),
    ]);

    return { success: true, data: { success: true } };
  },

  /**
   * Guarded shift status toggle
   */
  async setDutyStatus(
    userId: string,
    status: "ON_DUTY" | "OFF_DUTY"
  ): Promise<ServiceResult<{ shiftStatus: string }>> {
    const rider = await prisma.riderProfile.findUnique({
      where: { userId },
      include: {
        deliveries: {
          where: {
            status: { in: ["ASSIGNED", "ACCEPTED", "PICKED_UP", "ARRIVED_AT_CUSTOMER"] },
          },
        },
      },
    });

    if (!rider) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Rider profile not found.", 404),
      };
    }

    if (status === "ON_DUTY") {
      if (rider.licenseStatus !== "VERIFIED") {
        return {
          success: false,
          error: new ServiceError("UNVERIFIED_LICENSE", "Cannot go on duty: your license is pending verification by management.", 403),
        };
      }
      if (rider.licenseExpiresAt && rider.licenseExpiresAt < new Date()) {
        return {
          success: false,
          error: new ServiceError("EXPIRED_LICENSE", "Cannot go on duty: your driver license has expired. Please contact management.", 403),
        };
      }
    }

    if (status === "OFF_DUTY" && rider.deliveries.length > 0) {
      return {
        success: false,
        error: new ServiceError("ACTIVE_DELIVERIES", "Cannot go off duty with active deliveries in progress. Please complete or hand over orders first.", 400),
      };
    }

    const updated = await prisma.riderProfile.update({
      where: { id: rider.id },
      data: {
        shiftStatus: status,
        lastActiveAt: new Date(),
      },
      select: { shiftStatus: true },
    });

    return { success: true, data: updated };
  },

  /**
   * List active orders assigned to caller (zero publicToken or OTP exposed)
   */
  async getRiderOrders(userId: string): Promise<ServiceResult<RiderActiveOrder[]>> {
    const rider = await prisma.riderProfile.findUnique({
      where: { userId },
    });

    if (!rider) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Rider profile not found.", 404),
      };
    }

    const deliveries = await prisma.delivery.findMany({
      where: {
        riderId: rider.id,
        status: { in: ["ASSIGNED", "ACCEPTED", "PICKED_UP", "ARRIVED_AT_CUSTOMER"] },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerPhone: true,
            deliveryAddress: true,
            total: true,
            status: true,
            paymentMethod: true,
            paymentStatus: true,
            items: {
              select: {
                name: true,
                quantity: true,
                unitPrice: true,
                lineTotal: true,
              },
            },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    const sanitized = deliveries.map((d) => ({
      deliveryId: d.id,
      orderId: d.orderId,
      orderNumber: d.order.orderNumber,
      customerName: d.order.customerName,
      customerPhone: d.order.customerPhone, // Real phone only while active
      deliveryAddress: d.order.deliveryAddress,
      customerLat: d.customerLat,
      customerLng: d.customerLng,
      deliveryStatus: d.status,
      orderStatus: d.order.status,
      totalPaisa: d.order.total,
      codAmountPaisa: d.codAmountPaisa,
      paymentMethod: d.order.paymentMethod,
      paymentStatus: d.order.paymentStatus,
      items: d.order.items,
      assignedAt: d.assignedAt,
      acceptedAt: d.acceptedAt,
      pickedUpAt: d.pickedUpAt,
    }));

    return { success: true, data: sanitized };
  },

  /**
   * Log an audit event when a rider taps "Call Customer"
   */
  async logCall(
    userId: string,
    orderId: string
  ): Promise<ServiceResult<{ success: boolean }>> {
    const rider = await prisma.riderProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!rider) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Rider profile not found.", 404),
      };
    }

    const delivery = await prisma.delivery.findFirst({
      where: {
        orderId,
        riderId: rider.id,
        status: { in: ["ASSIGNED", "ACCEPTED", "PICKED_UP", "ARRIVED_AT_CUSTOMER"] },
      },
      include: { order: true },
    });

    if (!delivery) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Active delivery not found.", 404),
      };
    }

    await writeAuditLog({
      userId: rider.userId,
      actorEmail: rider.user.email,
      action: "rider.customer_call",
      entity: "Order",
      entityId: orderId,
      details: {
        orderNumber: delivery.order.orderNumber,
        deliveryStatus: delivery.status,
      },
    });

    return { success: true, data: { success: true } };
  },
};
