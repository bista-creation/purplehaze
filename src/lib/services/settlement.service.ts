/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { prisma } from "@/lib/prisma";
import { getNepalDayRange } from "@/lib/time";
import { ServiceError, ServiceResult } from "./rider.service";
import { writeAuditLog } from "@/lib/audit";

export interface RiderSettlementSummary {
  settlementId: string;
  settlementDate: string;
  riderId: string;
  riderName: string | null;
  riderPhone: string | null;
  shiftStatus: string;
  status: "PENDING" | "RECONCILED" | "DISCREPANCY";
  ordersDelivered: number;
  codOrdersCount: number;
  codExpectedPaisa: number;
  riderReportedPaisa: number;
  cashierCountPaisa: number;
  differencePaisa: number;
  notes: string | null;
  reconciledAt: Date | null;
  reconciledByAdminName: string | null;
  handovers: Array<{
    id: string;
    amountPaisa: number;
    receivedAt: Date;
    receivedByName: string | null;
    notes: string | null;
  }>;
  deliveredOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    paymentMethod: string;
    totalPaisa: number;
    codAmountPaisa: number;
    cashCollectedPaisa: number | null;
    deliveredAt: Date | null;
  }>;
}

export const settlementService = {
  /**
   * Get or calculate today's cash settlement for the authenticated rider
   * Boundary strictly Asia/Kathmandu (UTC+05:45)
   */
  async getRiderTodaySettlement(userId: string): Promise<ServiceResult<RiderSettlementSummary>> {
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

    const { startOfDay, endOfDay, dateStr } = getNepalDayRange();

    // Find all orders delivered by this rider within today's Nepal timezone bounds
    const deliveredDeliveries = await prisma.delivery.findMany({
      where: {
        riderId: rider.id,
        status: "DELIVERED",
        deliveredAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerPhone: true,
            paymentMethod: true,
            total: true,
          },
        },
      },
      orderBy: { deliveredAt: "desc" },
    });

    const totalDelivered = deliveredDeliveries.length;
    const codDeliveries = deliveredDeliveries.filter((d) => d.order.paymentMethod === "COD");
    
    const getNormalizedCod = (d: (typeof deliveredDeliveries)[0]) => {
      const orderTotal = d.order.total;
      let cod = d.codAmountPaisa;
      if (cod > orderTotal && orderTotal > 0 && (cod === orderTotal * 100 || cod > orderTotal * 50)) {
        return orderTotal;
      }
      return cod || orderTotal;
    };

    const getNormalizedCollected = (d: (typeof deliveredDeliveries)[0]) => {
      const expected = getNormalizedCod(d);
      let collected = d.cashCollectedPaisa ?? expected;
      if (collected > d.order.total && d.order.total > 0 && (collected === d.order.total * 100 || collected > d.order.total * 50)) {
        return d.order.total;
      }
      return collected;
    };

    const codExpectedPaisa = codDeliveries.reduce((sum, d) => sum + getNormalizedCod(d), 0);
    const riderReportedPaisa = codDeliveries.reduce((sum, d) => sum + getNormalizedCollected(d), 0);

    // Upsert the RiderSettlement record for today
    const settlement = await prisma.riderSettlement.upsert({
      where: {
        riderId_settlementDate: {
          riderId: rider.id,
          settlementDate: startOfDay,
        },
      },
      create: {
        riderId: rider.id,
        settlementDate: startOfDay,
        ordersDelivered: totalDelivered,
        codExpectedPaisa,
        riderReportedPaisa,
        cashierCountPaisa: 0,
        differencePaisa: 0 - codExpectedPaisa,
        status: codExpectedPaisa === 0 ? "RECONCILED" : "PENDING",
      },
      update: {
        ordersDelivered: totalDelivered,
        codExpectedPaisa,
        riderReportedPaisa,
      },
      include: {
        handovers: {
          include: {
            receivedByAdmin: { select: { name: true } },
          },
          orderBy: { receivedAt: "desc" },
        },
        reconciledByAdmin: { select: { name: true } },
      },
    });

    return {
      success: true,
      data: {
        settlementId: settlement.id,
        settlementDate: dateStr,
        riderId: rider.id,
        riderName: rider.user.name,
        riderPhone: rider.user.phone,
        shiftStatus: rider.shiftStatus,
        status: settlement.status as "PENDING" | "RECONCILED" | "DISCREPANCY",
        ordersDelivered: settlement.ordersDelivered,
        codOrdersCount: codDeliveries.length,
        codExpectedPaisa: settlement.codExpectedPaisa,
        riderReportedPaisa: settlement.riderReportedPaisa,
        cashierCountPaisa: settlement.cashierCountPaisa,
        differencePaisa: settlement.differencePaisa,
        notes: settlement.notes,
        reconciledAt: settlement.reconciledAt,
        reconciledByAdminName: settlement.reconciledByAdmin?.name || null,
        handovers: settlement.handovers.map((h) => ({
          id: h.id,
          amountPaisa: h.amountPaisa,
          receivedAt: h.receivedAt,
          receivedByName: h.receivedByAdmin?.name || null,
          notes: h.notes,
        })),
        deliveredOrders: deliveredDeliveries.map((d) => {
          const cod = getNormalizedCod(d);
          const collected = getNormalizedCollected(d);
          return {
            id: d.id,
            orderNumber: d.order.orderNumber,
            customerName: d.order.customerName,
            customerPhone: d.order.customerPhone,
            paymentMethod: d.order.paymentMethod,
            totalPaisa: d.order.total,
            codAmountPaisa: cod,
            cashCollectedPaisa: collected,
            deliveredAt: d.deliveredAt,
          };
        }),
      },
    };
  },

  /**
   * Cashier/Admin records cash handed over by a rider for a settlement
   */
  async recordCashHandover(input: {
    settlementId: string;
    amountPaisa: number;
    adminUser: { id: string; email: string };
    notes?: string;
  }): Promise<ServiceResult<any>> {
    const settlement = await prisma.riderSettlement.findUnique({
      where: { id: input.settlementId },
      include: {
        rider: { include: { user: true } },
        handovers: true,
      },
    });

    if (!settlement) {
      return {
        success: false,
        error: new ServiceError("NOT_FOUND", "Settlement record not found.", 404),
      };
    }

    if (input.amountPaisa <= 0) {
      return {
        success: false,
        error: new ServiceError("BAD_REQUEST", "Handover amount must be greater than zero.", 400),
      };
    }

    const [handover, updatedSettlement] = await prisma.$transaction(async (tx) => {
      // Create handover record
      const h = await tx.riderCashHandover.create({
        data: {
          settlementId: input.settlementId,
          amountPaisa: input.amountPaisa,
          receivedByAdminId: input.adminUser.id,
          notes: input.notes,
        },
      });

      // Recalculate total handed over across all entries for this settlement
      const allHandovers = await tx.riderCashHandover.findMany({
        where: { settlementId: input.settlementId },
      });
      const totalHandedOver = allHandovers.reduce((sum, item) => sum + item.amountPaisa, 0);
      const differencePaisa = totalHandedOver - settlement.codExpectedPaisa;
      const status = differencePaisa === 0 ? "RECONCILED" : "DISCREPANCY";

      const updated = await tx.riderSettlement.update({
        where: { id: input.settlementId },
        data: {
          cashierCountPaisa: totalHandedOver,
          differencePaisa,
          status,
          reconciledByAdminId: input.adminUser.id,
          reconciledAt: new Date(),
          notes: input.notes
            ? settlement.notes
              ? `${settlement.notes} | ${input.notes}`
              : input.notes
            : settlement.notes,
        },
        include: {
          handovers: {
            include: { receivedByAdmin: { select: { name: true } } },
          },
        },
      });

      return [h, updated];
    });

    await writeAuditLog({
      userId: input.adminUser.id,
      actorEmail: input.adminUser.email,
      action: "settlement.cash_handover",
      entity: "RiderSettlement",
      entityId: settlement.id,
      details: {
        riderEmail: settlement.rider.user.email,
        amountPaisa: input.amountPaisa,
        totalCashierCountPaisa: updatedSettlement.cashierCountPaisa,
        codExpectedPaisa: settlement.codExpectedPaisa,
        differencePaisa: updatedSettlement.differencePaisa,
        status: updatedSettlement.status,
      },
    });

    return {
      success: true,
      data: {
        handover,
        settlement: updatedSettlement,
      },
    };
  },

  /**
   * List all settlements for restaurant management/accounts on a given date (defaults to today)
   */
  async listSettlementsForDate(dateStr?: string): Promise<
    ServiceResult<{
      dateStr: string;
      totalCodExpectedPaisa: number;
      totalCashierCountPaisa: number;
      totalDifferencePaisa: number;
      settlements: any[];
    }>
  > {
    const { startOfDay, endOfDay, dateStr: activeDate } = getNepalDayRange(dateStr);

    const riders = await prisma.riderProfile.findMany({
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, isBlocked: true } },
        settlements: {
          where: { settlementDate: startOfDay },
          include: {
            handovers: {
              include: { receivedByAdmin: { select: { name: true } } },
            },
            reconciledByAdmin: { select: { name: true } },
          },
        },
        deliveries: {
          where: {
            status: "DELIVERED",
            deliveredAt: { gte: startOfDay, lte: endOfDay },
          },
          select: {
            id: true,
            codAmountPaisa: true,
            cashCollectedPaisa: true,
            order: { select: { paymentMethod: true, total: true } },
          },
        },
      },
    });

    let totalCodExpectedPaisa = 0;
    let totalCashierCountPaisa = 0;
    let totalDifferencePaisa = 0;

    const settlements = riders.map((r) => {
      const existingSettlement = r.settlements[0];
      const codDeliveries = r.deliveries.filter((d) => d.order.paymentMethod === "COD");
      const codExpectedPaisa = codDeliveries.reduce((sum, d) => {
        const orderTotal = d.order.total;
        let cod = d.codAmountPaisa;
        if (cod > orderTotal && orderTotal > 0 && (cod === orderTotal * 100 || cod > orderTotal * 50)) {
          return orderTotal;
        }
        return cod || orderTotal;
      }, 0);
      const riderReportedPaisa = codDeliveries.reduce((sum, d) => {
        const orderTotal = d.order.total;
        let cod = d.codAmountPaisa;
        if (cod > orderTotal && orderTotal > 0 && (cod === orderTotal * 100 || cod > orderTotal * 50)) {
          cod = orderTotal;
        }
        let collected = d.cashCollectedPaisa ?? cod;
        if (collected > orderTotal && orderTotal > 0 && (collected === orderTotal * 100 || collected > orderTotal * 50)) {
          collected = orderTotal;
        }
        return sum + collected;
      }, 0);

      const cashierCountPaisa = existingSettlement?.cashierCountPaisa ?? 0;
      const differencePaisa = existingSettlement
        ? existingSettlement.differencePaisa
        : 0 - codExpectedPaisa;
      const status = existingSettlement
        ? existingSettlement.status
        : codExpectedPaisa === 0
        ? "RECONCILED"
        : "PENDING";

      totalCodExpectedPaisa += codExpectedPaisa;
      totalCashierCountPaisa += cashierCountPaisa;
      totalDifferencePaisa += differencePaisa;

      return {
        settlementId: existingSettlement?.id || null,
        riderId: r.id,
        riderName: r.user.name,
        riderPhone: r.user.phone,
        riderEmail: r.user.email,
        shiftStatus: r.shiftStatus,
        ordersDeliveredCount: r.deliveries.length,
        codOrdersCount: codDeliveries.length,
        codExpectedPaisa,
        riderReportedPaisa,
        cashierCountPaisa,
        differencePaisa,
        status,
        handoversCount: existingSettlement?.handovers.length ?? 0,
        reconciledAt: existingSettlement?.reconciledAt || null,
        reconciledByName: existingSettlement?.reconciledByAdmin?.name || null,
        notes: existingSettlement?.notes || null,
      };
    });

    return {
      success: true,
      data: {
        dateStr: activeDate,
        totalCodExpectedPaisa,
        totalCashierCountPaisa,
        totalDifferencePaisa,
        settlements,
      },
    };
  },
};
