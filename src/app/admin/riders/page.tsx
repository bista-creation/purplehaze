import type { Metadata } from "next";
import { Bike, ShieldCheck, UserCheck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { StatCard } from "@/components/admin/stat-card";
import { RiderAdmin, type RiderRow } from "@/components/admin/rider-admin";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/security";

export const metadata: Metadata = { title: "Delivery Riders" };
export const dynamic = "force-dynamic";

export default async function AdminRidersPage() {
  await requireStaff("/admin/riders");

  let riders: RiderRow[] = [];
  let onDutyCount = 0;
  let activeDeliveriesTotal = 0;

  try {
    const rawRiders = await prisma.riderProfile.findMany({
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

    riders = rawRiders.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.user.name,
      email: r.user.email,
      phone: r.user.phone,
      isBlocked: r.user.isBlocked,
      vehicleType: r.vehicleType,
      licenseStatus: r.licenseStatus,
      licenseVerifiedAt: r.licenseVerifiedAt?.toISOString() || null,
      licenseExpiresAt: r.licenseExpiresAt?.toISOString() || null,
      shiftStatus: r.shiftStatus,
      mustChangePassword: r.mustChangePassword,
      lastActiveAt: r.lastActiveAt?.toISOString() || null,
      activeDeliveriesCount: r.deliveries.length,
      createdAt: r.createdAt.toISOString(),
    }));

    onDutyCount = riders.filter((r) => r.shiftStatus === "ON_DUTY").length;
    activeDeliveriesTotal = riders.reduce((acc, r) => acc + r.activeDeliveriesCount, 0);
  } catch (error) {
    console.error("Error loading riders:", error);
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Fleet & Logistics"
        title="Delivery Riders"
        description="Oversee restaurant delivery personnel, verify driver documents, manage shift availability, and control fleet access."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total riders"
          value={String(riders.length)}
          hint="Enrolled delivery personnel"
          icon={Bike}
        />
        <StatCard
          label="On-duty riders"
          value={String(onDutyCount)}
          hint="Available for dispatch"
          icon={UserCheck}
        />
        <StatCard
          label="Active deliveries"
          value={String(activeDeliveriesTotal)}
          hint="Currently on the road"
          icon={ShieldCheck}
        />
      </div>

      <RiderAdmin riders={riders} />
    </>
  );
}
