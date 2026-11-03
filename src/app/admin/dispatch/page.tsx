import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page";
import {
  DispatchBoard,
  type DispatchDelivery,
  type UndispatchedOrder,
  type OnDutyRider,
} from "@/components/admin/dispatch-board";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/security";
import { deliveryService } from "@/lib/services/delivery.service";

export const metadata: Metadata = { title: "Dispatch Board" };
export const dynamic = "force-dynamic";

export default async function AdminDispatchPage() {
  const user = await requireStaff("/admin/dispatch");
  const isAdmin = user.role === "ADMIN";

  let deliveries: DispatchDelivery[] = [];
  let undispatched: UndispatchedOrder[] = [];
  let riders: OnDutyRider[] = [];

  try {
    const [dispatchData, onDutyRiders] = await Promise.all([
      deliveryService.listDeliveriesForDispatch(),
      prisma.riderProfile.findMany({
        where: {
          shiftStatus: "ON_DUTY",
          licenseStatus: "VERIFIED",
          user: { isBlocked: false },
        },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          deliveries: {
            where: {
              status: { in: ["ASSIGNED", "ACCEPTED", "PICKED_UP", "ARRIVED_AT_CUSTOMER"] },
            },
            select: { id: true },
          },
        },
      }),
    ]);

    if (dispatchData.success && dispatchData.data) {
      deliveries = dispatchData.data.deliveries;
      undispatched = dispatchData.data.undispatchedOrders;
    }

    riders = onDutyRiders.map((r) => ({
      id: r.id,
      name: r.user.name,
      phone: r.user.phone,
      vehicleType: r.vehicleType,
      activeDeliveriesCount: r.deliveries.length,
      licenseStatus: r.licenseStatus,
    }));
  } catch (error) {
    console.error("Error loading dispatch board data:", error);
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Fleet & Logistics"
        title="Live Dispatch Board"
        description="Monitor real-time delivery trips, dispatch orders to on-duty riders, review acceptance timeouts, and resolve exceptions."
      />

      <DispatchBoard
        initialDeliveries={deliveries}
        initialUndispatched={undispatched}
        riders={riders}
        isAdmin={isAdmin}
      />
    </>
  );
}
