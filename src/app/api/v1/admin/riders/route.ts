import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { riderService } from "@/lib/services/rider.service";

const createRiderSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  vehicleType: z.string().optional(),
  plateNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiresAt: z.string().datetime().optional().nullable(),
  temporaryPassword: z.string().min(8).optional(),
});

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth(req);
  if (errorResponse) return errorResponse;

  const riders = await prisma.riderProfile.findMany({
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
      deliveries: {
        where: {
          status: { in: ["ASSIGNED", "ACCEPTED", "PICKED_UP", "ARRIVED_AT_CUSTOMER"] },
        },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = riders.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.user.name,
    email: r.user.email,
    phone: r.user.phone,
    isBlocked: r.user.isBlocked,
    vehicleType: r.vehicleType,
    licenseStatus: r.licenseStatus,
    licenseVerifiedAt: r.licenseVerifiedAt,
    licenseExpiresAt: r.licenseExpiresAt,
    shiftStatus: r.shiftStatus,
    mustChangePassword: r.mustChangePassword,
    lastActiveAt: r.lastActiveAt,
    activeDeliveriesCount: r.deliveries.length,
    createdAt: r.createdAt,
  }));

  return jsonOk(formatted);
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAdminAuth(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const parsed = createRiderSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const input = {
      ...parsed.data,
      licenseExpiresAt: parsed.data.licenseExpiresAt
        ? new Date(parsed.data.licenseExpiresAt)
        : undefined,
    };

    const result = await riderService.createRider(input, {
      id: user.id,
      email: user.email,
    });

    if (!result.success) {
      return jsonError(
        result.error?.code || "FAILED",
        result.error?.message || "Failed to create rider",
        result.error?.statusCode || 400
      );
    }

    return jsonOk(result.data, undefined, 201);
  } catch {
    return jsonError("BAD_REQUEST", "Invalid request payload", 400);
  }
}
