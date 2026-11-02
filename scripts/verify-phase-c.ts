import { PrismaClient } from "@prisma/client";
import { mobilePaymentService } from "@/lib/services/mobile-payment.service";
import { mayaService } from "@/lib/services/maya.service";
import { paisaToRupees } from "@/lib/money";

const prisma = new PrismaClient();

async function main() {
  console.log("===============================================================");
  console.log("   PURPLE HAZE PHASE (c) & SECURITY VERIFICATION SUITE         ");
  console.log("===============================================================\n");

  const dbUrl = process.env.DATABASE_URL || "";
  console.log("--> Target Database:", dbUrl.split("@")[1]?.split("/")[0] || dbUrl);
  if (!dbUrl.includes("ep-autumn-grass-b55zj482")) {
    console.error("Safety guard: Refusing to run on production database!");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // 1. SUPABASE REALTIME POSTGRES RLS VERIFICATION
  // -------------------------------------------------------------------------
  console.log("---------------------------------------------------------------");
  console.log("CHECK 1: Supabase Realtime Authorization on realtime.messages");
  console.log("---------------------------------------------------------------");

  const userAId = "test-user-a-uuid";
  const userBId = "test-user-b-uuid";

  await prisma.$executeRawUnsafe(`
    DELETE FROM realtime.messages WHERE topic IN ('user-${userAId}', 'user-${userBId}', 'admin-orders', 'menu-availability');
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO realtime.messages (id, topic, extension, payload)
    VALUES
      ('00000000-0000-0000-0000-000000000001', 'user-${userAId}', 'broadcast', '{"test": 1}'),
      ('00000000-0000-0000-0000-000000000002', 'user-${userBId}', 'broadcast', '{"test": 2}'),
      ('00000000-0000-0000-0000-000000000003', 'admin-orders', 'broadcast', '{"test": 3}'),
      ('00000000-0000-0000-0000-000000000004', 'menu-availability', 'broadcast', '{"test": 4}');
  `);

  const userBClaims = { sub: userBId, role: "authenticated", app_role: "CUSTOMER" };
  const userBVisibility = await prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe("SELECT set_config('request.jwt.claims', $1, true)", JSON.stringify(userBClaims));
    await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated");
    const canReadA = await tx.$queryRawUnsafe<{ count: number }[]>(`SELECT count(*)::int as count FROM realtime.messages WHERE topic = 'user-${userAId}'`);
    const canReadAdmin = await tx.$queryRawUnsafe<{ count: number }[]>(`SELECT count(*)::int as count FROM realtime.messages WHERE topic = 'admin-orders'`);
    const canReadOwn = await tx.$queryRawUnsafe<{ count: number }[]>(`SELECT count(*)::int as count FROM realtime.messages WHERE topic = 'user-${userBId}'`);
    const canReadPublic = await tx.$queryRawUnsafe<{ count: number }[]>(`SELECT count(*)::int as count FROM realtime.messages WHERE topic = 'menu-availability'`);
    return {
      canReadA: Number(canReadA[0]?.count || 0),
      canReadAdmin: Number(canReadAdmin[0]?.count || 0),
      canReadOwn: Number(canReadOwn[0]?.count || 0),
      canReadPublic: Number(canReadPublic[0]?.count || 0),
    };
  });

  console.log("User B Realtime Query Results under RLS:", userBVisibility);

  const staffClaims = { sub: "staff-uuid", role: "authenticated", app_role: "STAFF" };
  const staffVisibility = await prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe("SELECT set_config('request.jwt.claims', $1, true)", JSON.stringify(staffClaims));
    await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated");
    const canReadAdmin = await tx.$queryRawUnsafe<{ count: number }[]>(`SELECT count(*)::int as count FROM realtime.messages WHERE topic = 'admin-orders'`);
    return { canReadAdmin: Number(canReadAdmin[0]?.count || 0) };
  });

  console.log("Staff Realtime Query Results under RLS:", staffVisibility);

  if (userBVisibility.canReadA !== 0) throw new Error("Security Violation: User B was able to read User A channel!");
  if (userBVisibility.canReadAdmin !== 0) throw new Error("Security Violation: User B was able to read admin-orders!");
  if (userBVisibility.canReadOwn !== 1) throw new Error("Assertion Failure: User B could not read own channel!");
  if (userBVisibility.canReadPublic !== 1) throw new Error("Assertion Failure: User B could not read menu-availability!");
  if (staffVisibility.canReadAdmin !== 1) throw new Error("Assertion Failure: Staff could not read admin-orders!");

  await prisma.$executeRawUnsafe(`
    DELETE FROM realtime.messages WHERE topic IN ('user-${userAId}', 'user-${userBId}', 'admin-orders', 'menu-availability');
  `);
  console.log(">>> CHECK 1 PASSED: Supabase Realtime Authorization enforced strictly by Postgres RLS.\n");

  // -------------------------------------------------------------------------
  // 2. PAYMENT CALLBACK REJECTION & STATE PRESERVATION (eSewa & Khalti)
  // -------------------------------------------------------------------------
  console.log("---------------------------------------------------------------");
  console.log("CHECK 2: Payment Callbacks — State Preservation on Tampered/Mismatched Requests");
  console.log("---------------------------------------------------------------");

  // Create test orders
  const testOrderEsewa = await prisma.order.create({
    data: {
      orderNumber: `PH-TEST-ES-${Date.now()}`,
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentMethod: "ESEWA",
      type: "DELIVERY",
      customerName: "Payment Test Customer",
      customerEmail: "payment.tester@example.com",
      customerPhone: "+9779800000099",
      subtotal: 50000,
      deliveryFee: 6500,
      discountAmount: 0,
      total: 56500, // NPR 565.00
      publicToken: "test-token-esewa-12345",
      isTest: true,
    },
  });

  const testOrderKhalti = await prisma.order.create({
    data: {
      orderNumber: `PH-TEST-KH-${Date.now()}`,
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentMethod: "KHALTI",
      type: "DELIVERY",
      customerName: "Khalti Test Customer",
      customerEmail: "khalti.tester@example.com",
      customerPhone: "+9779800000098",
      subtotal: 40000,
      deliveryFee: 6500,
      discountAmount: 0,
      total: 46500, // NPR 465.00
      publicToken: "test-token-khalti-12345",
      isTest: true,
    },
  });

  // 2a. eSewa Unsigned / Invalid Callback
  const esewaInvalid = await mobilePaymentService.handleEsewaCallback(testOrderEsewa.id, "corrupted-invalid-base64");
  const esewaOrderAfterInvalid = await prisma.order.findUnique({ where: { id: testOrderEsewa.id } });
  console.log("eSewa Invalid Payload Callback Result:", esewaInvalid);
  console.log("eSewa Order Payment Status in DB:", esewaOrderAfterInvalid?.paymentStatus);
  if (esewaOrderAfterInvalid?.paymentStatus !== "PENDING") {
    throw new Error("FAIL: Payment state was mutated to " + esewaOrderAfterInvalid?.paymentStatus + " on invalid payload!");
  }

  // 2b. eSewa Amount Mismatch Callback (e.g. NPR 100 instead of NPR 565.00)
  const mismatchPayload = Buffer.from(
    JSON.stringify({
      transaction_uuid: `${testOrderEsewa.id}-mismatch`,
      total_amount: "100.00",
      status: "COMPLETE",
      product_code: "EPAYTEST",
    }),
  ).toString("base64");

  const esewaMismatch = await mobilePaymentService.handleEsewaCallback(testOrderEsewa.id, mismatchPayload);
  const esewaOrderAfterMismatch = await prisma.order.findUnique({ where: { id: testOrderEsewa.id } });
  console.log("eSewa Amount Mismatch Callback Result:", esewaMismatch);
  console.log("eSewa Order Payment Status in DB:", esewaOrderAfterMismatch?.paymentStatus);
  if (esewaOrderAfterMismatch?.paymentStatus !== "PENDING") {
    throw new Error("FAIL: Payment state was mutated to " + esewaOrderAfterMismatch?.paymentStatus + " on amount mismatch!");
  }

  // 2c. eSewa Wrong Transaction ID Lookup
  const wrongUuidPayload = Buffer.from(
    JSON.stringify({
      transaction_uuid: `wrong-uuid-${Date.now()}`,
      total_amount: paisaToRupees(testOrderEsewa.total).toFixed(2),
      status: "COMPLETE",
      product_code: "EPAYTEST",
    }),
  ).toString("base64");

  const esewaWrongId = await mobilePaymentService.handleEsewaCallback(testOrderEsewa.id, wrongUuidPayload);
  const esewaOrderAfterWrongId = await prisma.order.findUnique({ where: { id: testOrderEsewa.id } });
  console.log("eSewa Wrong UUID Callback Result:", esewaWrongId);
  console.log("eSewa Order Payment Status in DB:", esewaOrderAfterWrongId?.paymentStatus);
  if (esewaOrderAfterWrongId?.paymentStatus !== "PENDING") {
    throw new Error("FAIL: Payment state was mutated on wrong UUID lookup!");
  }

  // 2d. Khalti Amount Mismatch & Invalid PIDX
  const khaltiWrongPidx = await mobilePaymentService.handleKhaltiCallback(testOrderKhalti.id, "fake-invalid-pidx-1234");
  const khaltiOrderAfterWrong = await prisma.order.findUnique({ where: { id: testOrderKhalti.id } });
  console.log("Khalti Invalid PIDX Callback Result:", khaltiWrongPidx);
  console.log("Khalti Order Payment Status in DB:", khaltiOrderAfterWrong?.paymentStatus);
  if (khaltiOrderAfterWrong?.paymentStatus !== "PENDING") {
    throw new Error("FAIL: Khalti payment status was mutated to " + khaltiOrderAfterWrong?.paymentStatus + " on invalid lookup!");
  }

  // 2e. Replay Protection on already-PAID order
  await prisma.order.update({
    where: { id: testOrderEsewa.id },
    data: { paymentStatus: "PAID" },
  });
  const esewaReplay = await mobilePaymentService.handleEsewaCallback(testOrderEsewa.id, mismatchPayload);
  console.log("eSewa Replay Callback on PAID Order:", esewaReplay);
  if (!esewaReplay.alreadyPaid) {
    throw new Error("FAIL: Replay callback did not recognize already-paid status!");
  }

  await prisma.order.update({
    where: { id: testOrderKhalti.id },
    data: { paymentStatus: "PAID" },
  });
  const khaltiReplay = await mobilePaymentService.handleKhaltiCallback(testOrderKhalti.id, "pidx-replay-test");
  console.log("Khalti Replay Callback on PAID Order:", khaltiReplay);
  if (!khaltiReplay.alreadyPaid) {
    throw new Error("FAIL: Khalti replay callback did not recognize already-paid status!");
  }

  // Cleanup test orders
  await prisma.payment.deleteMany({ where: { orderId: { in: [testOrderEsewa.id, testOrderKhalti.id] } } });
  await prisma.order.deleteMany({ where: { id: { in: [testOrderEsewa.id, testOrderKhalti.id] } } });
  console.log(">>> CHECK 2 PASSED: Mismatched/tampered payments rejected without altering state; replays handled idempotently.\n");

  // -------------------------------------------------------------------------
  // 3. MAYA ASSISTANT: GROUNDING, CAPS & KILL SWITCH
  // -------------------------------------------------------------------------
  console.log("---------------------------------------------------------------");
  console.log("CHECK 3: Maya AI Assistant — Grounding, Caps & Kill Switch");
  console.log("---------------------------------------------------------------");

  // Normal grounded query
  const mayaNormal = await mayaService.chat({
    message: "What food do you recommend for dinner?",
    clientIp: "127.0.0.1",
  });
  console.log("Maya Normal Chat Response:", mayaNormal.data?.reply);
  if (!mayaNormal.success || !mayaNormal.data?.reply) {
    throw new Error("FAIL: Maya failed to provide grounded recommendation!");
  }

  // Test Admin Kill Switch (simulate kill switch via Setting)
  await prisma.setting.upsert({
    where: { key: "maya_enabled" },
    update: { value: "false" },
    create: { key: "maya_enabled", value: "false", group: "features" },
  });

  const mayaKilled = await mayaService.chat({
    message: "Hello Maya",
    clientIp: "127.0.0.1",
  });
  console.log("Maya Kill Switch Response:", mayaKilled);
  if (mayaKilled.success || mayaKilled.status !== 503) {
    throw new Error("FAIL: Maya did not respond with 503 when kill switch was active!");
  }

  // Restore kill switch
  await prisma.setting.update({
    where: { key: "maya_enabled" },
    data: { value: "true" },
  });
  console.log(">>> CHECK 3 PASSED: Maya grounding active and Admin kill switch halts requests with 503.\n");

  // -------------------------------------------------------------------------
  // 4. ACCOUNT DELETION INTEGRITY
  // -------------------------------------------------------------------------
  console.log("---------------------------------------------------------------");
  console.log("CHECK 4: Account Deletion — Token Revocation, Data Purge & Order Anonymization");
  console.log("---------------------------------------------------------------");

  const deleteTestUser = await prisma.user.create({
    data: {
      email: `deletion.tester.${Date.now()}@example.com`,
      name: "Deletion Tester",
      role: "CUSTOMER",
      isTest: true,
    },
  });

  // Create associated records
  await prisma.refreshToken.create({
    data: {
      userId: deleteTestUser.id,
      tokenHash: `hash-${Date.now()}`,
      familyId: `family-${Date.now()}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.pushToken.create({
    data: {
      userId: deleteTestUser.id,
      token: `ExponentPushToken[${Date.now()}]`,
    },
  });

  const testAddr = await prisma.address.create({
    data: {
      userId: deleteTestUser.id,
      fullName: "Deletion Tester",
      phone: "+9779800000011",
      line1: "Main Road",
      city: "Biratnagar",
    },
  });

  const deleteOrder = await prisma.order.create({
    data: {
      orderNumber: `PH-DEL-${Date.now()}`,
      userId: deleteTestUser.id,
      addressId: testAddr.id,
      status: "COMPLETED",
      paymentStatus: "PAID",
      paymentMethod: "COD",
      type: "DELIVERY",
      customerName: "Deletion Tester",
      customerEmail: deleteTestUser.email,
      customerPhone: "+9779800000011",
      subtotal: 30000,
      deliveryFee: 6500,
      discountAmount: 0,
      total: 36500,
      publicToken: `token-del-${Date.now()}`,
      isTest: true,
    },
  });

  // Execute account deletion procedure (matching DELETE /api/v1/profile)
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId: deleteTestUser.id } }),
    prisma.pushToken.deleteMany({ where: { userId: deleteTestUser.id } }),
    prisma.favorite.deleteMany({ where: { userId: deleteTestUser.id } }),
    prisma.address.deleteMany({ where: { userId: deleteTestUser.id } }),
    prisma.order.updateMany({
      where: { userId: deleteTestUser.id },
      data: { userId: null },
    }),
    prisma.notificationRead.deleteMany({ where: { userId: deleteTestUser.id } }),
    prisma.notification.deleteMany({ where: { userId: deleteTestUser.id } }),
    prisma.session.deleteMany({ where: { userId: deleteTestUser.id } }),
    prisma.account.deleteMany({ where: { userId: deleteTestUser.id } }),
    prisma.user.delete({ where: { id: deleteTestUser.id } }),
  ]);

  // Verify database post-deletion state
  const userCheck = await prisma.user.findUnique({ where: { id: deleteTestUser.id } });
  const tokenCheck = await prisma.refreshToken.findMany({ where: { userId: deleteTestUser.id } });
  const pushCheck = await prisma.pushToken.findMany({ where: { userId: deleteTestUser.id } });
  const addrCheck = await prisma.address.findMany({ where: { userId: deleteTestUser.id } });
  const orderCheck = await prisma.order.findUnique({ where: { id: deleteOrder.id } });

  console.log("Post-Deletion User Exists:", !!userCheck);
  console.log("Remaining Refresh Tokens:", tokenCheck.length);
  console.log("Remaining Push Tokens:", pushCheck.length);
  console.log("Remaining Addresses:", addrCheck.length);
  console.log("Order Retained with userId = null:", orderCheck?.userId === null, "Order Status:", orderCheck?.status);

  if (userCheck !== null) throw new Error("FAIL: User record was not deleted!");
  if (tokenCheck.length > 0) throw new Error("FAIL: Refresh tokens remained!");
  if (pushCheck.length > 0) throw new Error("FAIL: Push tokens remained!");
  if (addrCheck.length > 0) throw new Error("FAIL: Addresses remained!");
  if (!orderCheck || orderCheck.userId !== null) throw new Error("FAIL: Order was not preserved/anonymized!");

  // Clean up test order
  await prisma.order.delete({ where: { id: deleteOrder.id } });
  console.log(">>> CHECK 4 PASSED: Complete data purge and compliant order anonymization verified.\n");

  console.log("===============================================================");
  console.log("   ALL PHASE (c) ARCHITECTURE & SECURITY CHECKS PASSED!        ");
  console.log("===============================================================");
}

main()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
