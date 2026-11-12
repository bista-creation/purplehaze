/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock audit log
vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    riderProfile: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    delivery: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    refreshToken: {
      deleteMany: vi.fn(),
    },
    pushToken: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}));

import { prisma } from "@/lib/prisma";
import { riderService } from "./rider.service";
import { generateDeliveryOtp, verifyDeliveryOtp } from "@/lib/security/otp";
import { encryptPii, decryptPii } from "@/lib/security/encryption";
import { writeAuditLog } from "@/lib/audit";

describe("Rider Service & Security Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PII Encryption & Decryption", () => {
    it("encrypts plate numbers and licenses using AES-256-GCM and decrypts accurately", () => {
      const plate = "Ba 2 Pa 9876";
      const license = "01-06-00987654";

      const encryptedPlate = encryptPii(plate);
      const encryptedLicense = encryptPii(license);

      expect(encryptedPlate).not.toBe(plate);
      expect(encryptedPlate).toContain(":"); // iv:authTag:ciphertext format
      expect(encryptedLicense).not.toBe(license);

      expect(decryptPii(encryptedPlate)).toBe(plate);
      expect(decryptPii(encryptedLicense)).toBe(license);
      expect(decryptPii(null)).toBeNull();
    });
  });

  describe("Delivery OTP Derivation & Verification", () => {
    it("generates 6-digit numeric OTP deterministically from deliveryId and otpVersion", () => {
      const deliveryId = "deliv_123456";
      const otp1 = generateDeliveryOtp(deliveryId, 1);
      const otp2 = generateDeliveryOtp(deliveryId, 1);

      expect(otp1).toHaveLength(6);
      expect(/^\d{6}$/.test(otp1)).toBe(true);
      expect(otp1).toBe(otp2); // Deterministic for same version
    });

    it("changes OTP immediately when otpVersion is incremented", () => {
      const deliveryId = "deliv_123456";
      const otpV1 = generateDeliveryOtp(deliveryId, 1);
      const otpV2 = generateDeliveryOtp(deliveryId, 2);

      expect(otpV1).not.toBe(otpV2);
      expect(verifyDeliveryOtp(deliveryId, 1, otpV1)).toBe(true);
      expect(verifyDeliveryOtp(deliveryId, 2, otpV1)).toBe(false); // Old OTP invalid for version 2
      expect(verifyDeliveryOtp(deliveryId, 2, otpV2)).toBe(true);
    });

    it("safely rejects invalid or malformed candidate OTPs", () => {
      const deliveryId = "deliv_123456";
      expect(verifyDeliveryOtp(deliveryId, 1, "")).toBe(false);
      expect(verifyDeliveryOtp(deliveryId, 1, "12345")).toBe(false);
      expect(verifyDeliveryOtp(deliveryId, 1, "abcdef")).toBe(false);
      expect(verifyDeliveryOtp(deliveryId, 1, "999999")).toBe(false);
    });
  });

  describe("Rider Provisioning & Admin Actions", () => {
    it("provisions a rider account, hashes temporary password, and encrypts documents", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "usr_rider_1",
        name: "Santosh Rai",
        email: "santosh@purplehaze.com",
        phone: "9801234567",
        role: "RIDER",
        emailVerified: new Date(),
        sessionVersion: 0,
        isBlocked: false,
      } as any);

      vi.mocked(prisma.riderProfile.create).mockResolvedValue({
        id: "prof_rider_1",
        userId: "usr_rider_1",
        vehicleType: "MOTORCYCLE",
        licenseStatus: "PENDING",
        mustChangePassword: true,
      } as any);

      const result = await riderService.createRider(
        {
          name: "Santosh Rai",
          email: "santosh@purplehaze.com",
          phone: "9801234567",
          plateNumber: "Ko 1 Pa 5555",
          licenseNumber: "02-05-12345678",
        },
        { id: "admin_1", email: "admin@purplehaze.com" }
      );

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe("santosh@purplehaze.com");
      expect(result.data?.temporaryPassword).toBeDefined();
      expect(result.data?.temporaryPassword.startsWith("Rider@")).toBe(true);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: "RIDER",
            sessionVersion: 0,
          }),
        })
      );

      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "rider.create",
          actorEmail: "admin@purplehaze.com",
        })
      );
    });

    it("blocks existing email or phone during rider creation", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "usr_existing",
        email: "santosh@purplehaze.com",
      } as any);

      const result = await riderService.createRider(
        {
          name: "Santosh Rai",
          email: "santosh@purplehaze.com",
          phone: "9801234567",
        },
        { id: "admin_1", email: "admin@purplehaze.com" }
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("USER_EXISTS");
      expect(result.error?.statusCode).toBe(409);
    });

    it("writes audit log when admin inspects rider decrypted PII", async () => {
      const encryptedPlate = encryptPii("Ko 2 Pa 9999");
      vi.mocked(prisma.riderProfile.findUnique).mockResolvedValue({
        id: "prof_1",
        userId: "usr_1",
        encryptedPlateNumber: encryptedPlate,
        encryptedLicenseNo: null,
        vehicleType: "MOTORCYCLE",
        licenseStatus: "VERIFIED",
        user: {
          id: "usr_1",
          name: "Rider Test",
          email: "rider@test.com",
          phone: "9800000000",
        },
      } as any);

      const result = await riderService.getRiderAdminDetails("prof_1", {
        id: "admin_1",
        email: "admin@test.com",
      });

      expect(result.success).toBe(true);
      expect(result.data?.plateNumber).toBe("Ko 2 Pa 9999");
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "rider.pii.decrypt",
          entityId: "prof_1",
        })
      );
    });
  });

  describe("Duty Status Rules & Guards", () => {
    it("blocks rider from going ON_DUTY when license is PENDING", async () => {
      vi.mocked(prisma.riderProfile.findUnique).mockResolvedValue({
        id: "prof_1",
        userId: "usr_1",
        licenseStatus: "PENDING",
        licenseExpiresAt: null,
        deliveries: [],
      } as any);

      const result = await riderService.setDutyStatus("usr_1", "ON_DUTY");
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNVERIFIED_LICENSE");
      expect(result.error?.statusCode).toBe(403);
    });

    it("blocks rider from going ON_DUTY when license is EXPIRED", async () => {
      vi.mocked(prisma.riderProfile.findUnique).mockResolvedValue({
        id: "prof_1",
        userId: "usr_1",
        licenseStatus: "VERIFIED",
        licenseExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        deliveries: [],
      } as any);

      const result = await riderService.setDutyStatus("usr_1", "ON_DUTY");
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EXPIRED_LICENSE");
      expect(result.error?.statusCode).toBe(403);
    });

    it("blocks rider from going OFF_DUTY while active deliveries are in progress", async () => {
      vi.mocked(prisma.riderProfile.findUnique).mockResolvedValue({
        id: "prof_1",
        userId: "usr_1",
        licenseStatus: "VERIFIED",
        licenseExpiresAt: null,
        deliveries: [{ id: "deliv_active_1" }] as any,
      } as any);

      const result = await riderService.setDutyStatus("usr_1", "OFF_DUTY");
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("ACTIVE_DELIVERIES");
      expect(result.error?.statusCode).toBe(400);
    });

    it("allows rider with verified non-expired license to go ON_DUTY", async () => {
      vi.mocked(prisma.riderProfile.findUnique).mockResolvedValue({
        id: "prof_1",
        userId: "usr_1",
        licenseStatus: "VERIFIED",
        licenseExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        deliveries: [],
      } as any);

      vi.mocked(prisma.riderProfile.update).mockResolvedValue({
        shiftStatus: "ON_DUTY",
      } as any);

      const result = await riderService.setDutyStatus("usr_1", "ON_DUTY");
      expect(result.success).toBe(true);
      expect(result.data?.shiftStatus).toBe("ON_DUTY");
    });
  });

  describe("Rider Block & Session Invalidation", () => {
    it("increments sessionVersion and wipes tokens immediately when rider is blocked", async () => {
      vi.mocked(prisma.riderProfile.findUnique).mockResolvedValue({
        id: "prof_1",
        userId: "usr_1",
        user: { id: "usr_1", email: "rider@test.com" },
      } as any);

      const result = await riderService.setRiderBlockedStatus("prof_1", true, {
        id: "admin_1",
        email: "admin@test.com",
      });

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "usr_1" },
          data: expect.objectContaining({
            isBlocked: true,
            sessionVersion: { increment: 1 },
          }),
        })
      );
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: "usr_1" },
      });
      expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: "usr_1" },
      });
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "rider.block",
        })
      );
    });

    it("resets rider temporary password, sets mustChangePassword to true, increments sessionVersion, and writes audit log", async () => {
      vi.mocked(prisma.riderProfile.findUnique).mockResolvedValue({
        id: "prof_1",
        userId: "usr_1",
        user: { id: "usr_1", name: "Rider Test", email: "rider@test.com" },
      } as any);

      const result = await riderService.adminResetRiderPassword(
        "prof_1",
        { id: "admin_1", email: "admin@test.com" },
        "NewRiderPass@2026"
      );

      expect(result.success).toBe(true);
      expect(result.data?.temporaryPassword).toBe("NewRiderPass@2026");
      expect(result.data?.email).toBe("rider@test.com");

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "usr_1" },
          data: expect.objectContaining({
            sessionVersion: { increment: 1 },
          }),
        })
      );
      expect(prisma.riderProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "prof_1" },
          data: { mustChangePassword: true },
        })
      );
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: "usr_1" },
      });
      expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: "usr_1" },
      });
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "rider.password_reset",
          actorEmail: "admin@test.com",
        })
      );
    });
  });
});
