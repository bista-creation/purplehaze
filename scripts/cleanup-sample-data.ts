import { PrismaClient } from "@prisma/client";

async function cleanDatabase(url: string, label: string) {
  console.log(`\n========================================`);
  console.log(`Cleaning database: ${label}`);
  console.log(`========================================`);

  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  try {
    // 1. Before counts
    const [
      ordersBefore,
      itemsBefore,
      paymentsBefore,
      deliveriesBefore,
      settlementsBefore,
      handoversBefore,
      reservationsBefore,
      eventBookingsBefore,
      notificationsBefore,
      dishesBefore,
      categoriesBefore,
      usersBefore,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.payment.count(),
      prisma.delivery.count(),
      prisma.riderSettlement.count(),
      prisma.riderCashHandover.count(),
      prisma.reservation.count(),
      prisma.eventBooking.count(),
      prisma.notification.count(),
      prisma.dish.count(),
      prisma.category.count(),
      prisma.user.count(),
    ]);

    console.log("Before counts:", {
      orders: ordersBefore,
      orderItems: itemsBefore,
      payments: paymentsBefore,
      deliveries: deliveriesBefore,
      riderSettlements: settlementsBefore,
      riderCashHandovers: handoversBefore,
      reservations: reservationsBefore,
      eventBookings: eventBookingsBefore,
      notifications: notificationsBefore,
      dishes: dishesBefore,
      categories: categoriesBefore,
      users: usersBefore,
    });

    // 2. Perform safe deletion of sample/test operational data
    console.log("Deleting sample orders, bookings, deliveries, and notifications...");

    // Delete notifications and reads
    await prisma.notificationRead.deleteMany({});
    const deletedNotifications = await prisma.notification.deleteMany({});
    console.log(`Deleted ${deletedNotifications.count} sample notifications`);

    // Delete deliveries & attempts (if not cascaded)
    await prisma.deliveryAttempt.deleteMany({});
    const deletedDeliveries = await prisma.delivery.deleteMany({});
    console.log(`Deleted ${deletedDeliveries.count} sample deliveries`);

    // Delete settlements & cash handovers
    await prisma.riderCashHandover.deleteMany({});
    const deletedSettlements = await prisma.riderSettlement.deleteMany({});
    console.log(`Deleted ${deletedSettlements.count} sample rider settlements`);

    // Delete orders (cascades items, history, payments)
    await prisma.orderStatusHistory.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.orderItem.deleteMany({});
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`Deleted ${deletedOrders.count} sample orders`);

    // Delete sample bookings & reservations
    const deletedReservations = await prisma.reservation.deleteMany({});
    const deletedEventBookings = await prisma.eventBooking.deleteMany({});
    console.log(`Deleted ${deletedReservations.count} reservations and ${deletedEventBookings.count} event bookings`);

    // Clear active test carts
    await prisma.cartItem.deleteMany({});
    await prisma.cart.deleteMany({});

    // 3. After counts verification
    const [
      ordersAfter,
      reservationsAfter,
      eventBookingsAfter,
      deliveriesAfter,
      dishesAfter,
      categoriesAfter,
      usersAfter,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.reservation.count(),
      prisma.eventBooking.count(),
      prisma.delivery.count(),
      prisma.dish.count(),
      prisma.category.count(),
      prisma.user.count(),
    ]);

    console.log("\nAfter counts (Production Cleanliness Check):", {
      orders: ordersAfter,
      reservations: reservationsAfter,
      eventBookings: eventBookingsAfter,
      deliveries: deliveriesAfter,
      dishes: dishesAfter,
      categories: categoriesAfter,
      users: usersAfter,
    });

    console.log(`✓ ${label} is clean and ready for real production!`);
  } catch (error) {
    console.error(`Error cleaning ${label}:`, error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const supabaseUrl =
    "postgresql://postgres.lcexncppqesfnsdetoqv:hackme%4099supabase@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres";
  const neonDevUrl =
    "postgresql://neondb_owner:npg_nDkcawBsiF50@ep-autumn-grass-b55zj482.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require";

  // Clean Supabase (production database with 133 menu dishes)
  await cleanDatabase(supabaseUrl, "Supabase Production DB");

  // Clean Neon Dev (branch used in .env.local)
  await cleanDatabase(neonDevUrl, "Neon Dev DB");
}

main().catch((e) => {
  console.error("Cleanup failed:", e);
  process.exit(1);
});
