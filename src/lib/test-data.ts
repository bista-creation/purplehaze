import type { Prisma } from "@prisma/client";

/**
 * Existing development orders created before the explicit `isTest` field was
 * added use this prefix. The prefix is also treated as test data at read time
 * so those records are never mixed into real metrics or exports.
 */
export const TEST_ORDER_PREFIX = "PH-SEED-";

/**
 * Test-data controls are deliberately limited to local/development UI. A
 * production deployment keeps test rows hidden even if a query parameter is
 * supplied manually.
 */
export function testDataControlsVisible() {
  return process.env.NODE_ENV !== "production";
}

export function isTestOrder(order: {
  isTest?: boolean | null;
  orderNumber?: string | null;
}) {
  return Boolean(
    order.isTest ||
      (order.orderNumber && order.orderNumber.startsWith(TEST_ORDER_PREFIX)),
  );
}

export const realOrderWhere = {
  isTest: false,
  NOT: { orderNumber: { startsWith: TEST_ORDER_PREFIX } },
} satisfies Prisma.OrderWhereInput;

export function realOrdersWhere(
  where: Prisma.OrderWhereInput = {},
): Prisma.OrderWhereInput {
  return { AND: [realOrderWhere, where] };
}

export const realNotificationWhere = {
  isTest: false,
} satisfies Prisma.NotificationWhereInput;
