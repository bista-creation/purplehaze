import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const LOYALTY_POINTS_PER_NPR = 1;
export const LOYALTY_NPR_PER_POINT = 100;
export const LOYALTY_REDEMPTION_POINTS = 200;
export const LOYALTY_REDEMPTION_PERCENT = 10;

const PAISA_PER_NPR = 100;

export function calculateLoyaltyPointsEarned(subtotalPaisa: number, discountPaisa: number) {
  const eligiblePaisa = Math.max(0, subtotalPaisa - discountPaisa);
  return Math.floor(eligiblePaisa / (LOYALTY_NPR_PER_POINT * PAISA_PER_NPR));
}

export function calculateLoyaltyDiscount(subtotalPaisa: number) {
  return Math.floor((subtotalPaisa * LOYALTY_REDEMPTION_PERCENT) / 100);
}

export async function getLoyaltySummary(userId: string) {
  const [account, transactions] = await Promise.all([
    prisma.loyaltyAccount.findUnique({ where: { userId } }),
    prisma.loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        kind: true,
        pointsDelta: true,
        description: true,
        createdAt: true,
        order: { select: { orderNumber: true } },
      },
    }),
  ]);

  const pointsBalance = account?.pointsBalance ?? 0;
  return {
    pointsBalance,
    lifetimePoints: account?.lifetimePoints ?? 0,
    pointsToNextReward: Math.max(0, LOYALTY_REDEMPTION_POINTS - pointsBalance),
    redemptionPoints: LOYALTY_REDEMPTION_POINTS,
    redemptionPercent: LOYALTY_REDEMPTION_PERCENT,
    earningRate: LOYALTY_POINTS_PER_NPR,
    rupeesPerPoint: LOYALTY_NPR_PER_POINT,
    transactions,
  };
}

export async function awardCompletedOrderPoints(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      status: true,
      isTest: true,
      subtotal: true,
      discountAmount: true,
      user: { select: { role: true } },
    },
  });
  if (
    !order ||
    order.status !== "COMPLETED" ||
    order.isTest ||
    !order.userId ||
    order.user?.role !== "CUSTOMER"
  ) return;

  const points = calculateLoyaltyPointsEarned(order.subtotal, order.discountAmount);
  if (points <= 0) return;

  const existing = await tx.loyaltyTransaction.findFirst({
    where: { userId: order.userId, orderId: order.id, kind: "EARN" },
    select: { id: true },
  });
  if (existing) return;

  await tx.loyaltyAccount.upsert({
    where: { userId: order.userId },
    create: {
      userId: order.userId,
      pointsBalance: points,
      lifetimePoints: points,
    },
    update: {
      pointsBalance: { increment: points },
      lifetimePoints: { increment: points },
    },
  });
  await tx.loyaltyTransaction.create({
    data: {
      userId: order.userId,
      orderId: order.id,
      kind: "EARN",
      pointsDelta: points,
      description: "Points earned for a completed order.",
    },
  });
}

export async function awardCompletedOrderPointsSafely(orderId: string) {
  try {
    await prisma.$transaction((tx) => awardCompletedOrderPoints(tx, orderId));
  } catch (error) {
    // Competing completion handlers can both observe the same order. The unique
    // ledger key makes the second award roll back instead of double-crediting.
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
  }
}

export async function refundRedeemedPoints(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, loyaltyPointsRedeemed: true },
  });
  if (!order?.userId || order.loyaltyPointsRedeemed <= 0) return;

  const existing = await tx.loyaltyTransaction.findFirst({
    where: { userId: order.userId, orderId: order.id, kind: "REFUND" },
    select: { id: true },
  });
  if (existing) return;

  await tx.loyaltyAccount.upsert({
    where: { userId: order.userId },
    create: { userId: order.userId, pointsBalance: order.loyaltyPointsRedeemed },
    update: { pointsBalance: { increment: order.loyaltyPointsRedeemed } },
  });
  await tx.loyaltyTransaction.create({
    data: {
      userId: order.userId,
      orderId: order.id,
      kind: "REFUND",
      pointsDelta: order.loyaltyPointsRedeemed,
      description: "Redeemed points returned for a cancelled order.",
    },
  });
}
