import { NextRequest, NextResponse } from "next/server";
import { mobilePaymentService } from "@/lib/services/mobile-payment.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const pidx = searchParams.get("pidx");
  const scheme = searchParams.get("scheme") || "purplehaze";

  if (!orderId || !pidx) {
    return new NextResponse("Missing orderId or pidx parameter", { status: 400 });
  }

  const result = await mobilePaymentService.handleKhaltiCallback(orderId, pidx);
  const status = result.success ? "PAID" : "FAILED";
  const reason = result.reason || "";
  const orderNumber = result.order?.orderNumber || "";

  const deepLink = `${scheme}://payment-result?orderId=${encodeURIComponent(
    orderId,
  )}&orderNumber=${encodeURIComponent(orderNumber)}&status=${status}&reason=${encodeURIComponent(reason)}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Payment ${status === "PAID" ? "Successful" : "Failed"}</title>
  <style>
    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f0a1c; color: #fff; text-align: center; padding: 20px; }
    .card { background: #1c1432; border: 1px solid #7c3aed; border-radius: 16px; padding: 32px; max-width: 400px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { color: ${status === "PAID" ? "#4ade80" : "#f87171"}; margin-bottom: 8px; font-size: 24px; }
    p { color: #cbd5e1; font-size: 14px; margin-bottom: 24px; }
    .btn { display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${status === "PAID" ? "Payment Successful!" : "Payment Incomplete"}</h1>
    <p>${status === "PAID" ? "Your order has been verified and confirmed." : reason || "The transaction could not be completed."}</p>
    <a href="${deepLink}" class="btn" id="openApp">Return to App</a>
  </div>
  <script>
    window.location.href = "${deepLink}";
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
