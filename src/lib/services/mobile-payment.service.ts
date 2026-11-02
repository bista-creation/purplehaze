import "server-only";
import { prisma } from "@/lib/prisma";
import {
  appUrl,
  getEsewaConfig,
  getKhaltiConfig,
  lookupEsewaTransaction,
  lookupKhaltiPayment,
  markOrderPaid,
  markPaymentFailed,
  parseEsewaCallbackData,
  signEsewa,
} from "@/lib/payments";
import { paisaToRupees } from "@/lib/money";

export class MobilePaymentService {
  async initiatePayment(
    orderId: string,
    provider: "ESEWA" | "KHALTI",
    appScheme = "purplehaze",
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!order) {
      throw new Error("Order not found.");
    }

    if (order.paymentStatus === "PAID") {
      return {
        alreadyPaid: true,
        orderNumber: order.orderNumber,
        status: "PAID",
      };
    }

    const totalRupees = paisaToRupees(order.total).toFixed(2);
    const returnUrl = `${appUrl()}/api/v1/payments/${provider.toLowerCase()}/verify?orderId=${encodeURIComponent(
      order.id,
    )}&scheme=${encodeURIComponent(appScheme)}`;

    if (provider === "ESEWA") {
      const config = getEsewaConfig();
      if (!config) {
        throw new Error("eSewa is not configured.");
      }

      const transactionUuid = `${order.id}-${Date.now()}`;
      const message = `total_amount=${totalRupees},transaction_uuid=${transactionUuid},product_code=${config.merchantCode}`;
      const signature = signEsewa(message, config.secretKey);

      return {
        provider: "ESEWA",
        formUrl: config.formUrl,
        params: {
          amount: totalRupees,
          tax_amount: "0",
          total_amount: totalRupees,
          transaction_uuid: transactionUuid,
          product_code: config.merchantCode,
          product_service_charge: "0",
          product_delivery_charge: "0",
          success_url: returnUrl,
          failure_url: `${returnUrl}&failed=1`,
          signed_field_names: "total_amount,transaction_uuid,product_code",
          signature,
        },
      };
    }

    if (provider === "KHALTI") {
      const config = getKhaltiConfig();
      if (!config) {
        throw new Error("Khalti is not configured.");
      }

      const res = await fetch(`${config.baseUrl}/epayment/initiate/`, {
        method: "POST",
        headers: {
          Authorization: `key ${config.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          return_url: returnUrl,
          website_url: appUrl(),
          amount: order.total, // paisa
          purchase_order_id: order.id,
          purchase_order_name: `Order ${order.orderNumber}`,
          customer_info: {
            name: order.customerName,
            email: order.customerEmail,
            phone: order.customerPhone,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.payment_url) {
        throw new Error(data.detail ?? data.error_message ?? "Failed to initiate Khalti payment.");
      }

      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "KHALTI",
          transactionId: data.pidx,
          amount: order.total,
          status: "INITIATED",
          payload: JSON.stringify(data),
        },
      });

      return {
        provider: "KHALTI",
        paymentUrl: data.payment_url,
        pidx: data.pidx,
      };
    }

    throw new Error(`Unsupported payment provider ${provider}`);
  }

  async handleEsewaCallback(orderId: string, encodedData?: string, failed?: boolean) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, reason: "Order not found" };

    if (failed || !encodedData) {
      await markPaymentFailed({
        orderId: order.id,
        provider: "ESEWA",
        reason: "Payment cancelled or rejected in eSewa.",
      });
      return { success: false, order, reason: "Payment cancelled." };
    }

    const parsed = parseEsewaCallbackData(encodedData);
    if (!parsed) {
      return { success: false, order, reason: "Invalid callback payload." };
    }

    const config = getEsewaConfig();
    if (!config) {
      return { success: false, order, reason: "eSewa is not configured." };
    }

    // Always perform server-side lookup!
    const lookup = await lookupEsewaTransaction({
      config,
      transactionUuid: parsed.transaction_uuid,
      totalAmountNpr: parsed.total_amount,
    });

    if (!lookup.ok || lookup.data.status !== "COMPLETE") {
      await markPaymentFailed({
        orderId: order.id,
        provider: "ESEWA",
        reason: "eSewa server verification failed.",
      });
      return { success: false, order, reason: "Transaction not completed." };
    }

    await markOrderPaid({
      orderId: order.id,
      provider: "ESEWA",
      transactionId: parsed.transaction_code || parsed.transaction_uuid,
      payload: lookup.data,
      note: "Paid via eSewa (Mobile Verified)",
    });

    return { success: true, order };
  }

  async handleKhaltiCallback(orderId: string, pidx: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, reason: "Order not found" };

    const config = getKhaltiConfig();
    if (!config) return { success: false, order, reason: "Khalti not configured" };

    // Always perform server-side lookup!
    const lookup = await lookupKhaltiPayment({ config, pidx });
    if (!lookup.ok || lookup.data.status !== "Completed") {
      await markPaymentFailed({
        orderId: order.id,
        provider: "KHALTI",
        reason: `Khalti status is ${lookup.data?.status ?? "unknown"}.`,
      });
      return { success: false, order, reason: "Payment incomplete." };
    }

    await markOrderPaid({
      orderId: order.id,
      provider: "KHALTI",
      transactionId: pidx,
      payload: lookup.data,
      note: "Paid via Khalti (Mobile Verified)",
    });

    return { success: true, order };
  }
}

export const mobilePaymentService = new MobilePaymentService();
