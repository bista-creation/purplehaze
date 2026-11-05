import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== DRY RUN: TEST ORDERS INVENTORY ===");
  console.log("Environment:", process.env.NODE_ENV || "development");

  // 1. Authoritative count of isTest = true orders
  const testOrders = await prisma.order.findMany({
    where: { isTest: true },
    select: {
      id: true,
      orderNumber: true,
      type: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      total: true,
      isTest: true,
      createdAt: true,
      delivery: {
        select: {
          id: true,
          status: true,
          provider: true,
          riderId: true,
        },
      },
      payments: {
        select: {
          id: true,
          status: true,
          amount: true,
          provider: true,
        },
      },
      items: {
        select: {
          id: true,
          name: true,
          quantity: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Count real orders to confirm we distinguish them accurately
  const realOrdersCount = await prisma.order.count({
    where: { isTest: false },
  });

  console.log("\n--- SUMMARY COUNTS ---");
  console.log(`Total Orders in Database: ${testOrders.length + realOrdersCount}`);
  console.log(`Test Orders (isTest = true): ${testOrders.length}`);
  console.log(`Real Production Orders (isTest = false): ${realOrdersCount}`);

  console.log("\n--- INVENTORY OF TEST ORDERS (DRY RUN ONLY - NO MUTATIONS) ---");
  for (const o of testOrders) {
    console.log(JSON.stringify({
      orderId: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      type: o.type,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      total: o.total,
      createdAt: o.createdAt.toISOString(),
      itemsCount: o.items.length,
      hasDelivery: Boolean(o.delivery),
      deliveryStatus: o.delivery?.status ?? null,
      hasPayments: o.payments.length > 0,
      paymentsCount: o.payments.length,
      paymentsSummary: o.payments.map(p => ({ id: p.id, status: p.status, amount: p.amount, provider: p.provider })),
    }, null, 2));
  }
}

main()
  .catch((e) => {
    console.error("Error running test orders inventory:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
