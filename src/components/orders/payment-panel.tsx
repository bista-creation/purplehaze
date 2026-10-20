"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { mockPayAction, verifyOnlinePaymentAction } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/constants";
import { formatNPR } from "@/lib/money";

export function PaymentPanel({
  orderId,
  orderNumber,
  token,
  method,
  paymentStatus,
  amount,
  paymentMode,
}: {
  orderId: string;
  orderNumber: string;
  token: string;
  method: string;
  paymentStatus: string;
  amount: number;
  paymentMode: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [checking, startChecking] = useTransition();
  const label = PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;

  if (paymentStatus === "PAID") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">Payment received</p>
          <p className="mt-0.5 text-xs leading-5 opacity-80">
            {label} · {formatNPR(amount)}
          </p>
        </div>
      </div>
    );
  }

  if (paymentStatus === "REFUNDED") {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
        <p className="font-semibold">Payment refunded</p>
        <p className="mt-1 text-xs leading-5 opacity-80">
          Online refunds are processed manually by our team. Contact us if you
          have a question.
        </p>
      </div>
    );
  }

  if (method === "COD") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <Wallet className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="font-semibold">Pay with cash</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Please have {formatNPR(amount)} ready. Payment is collected when
            your order is handed over.
          </p>
        </div>
      </div>
    );
  }

  if (paymentMode === "unavailable") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <CircleAlert className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">Online payment unavailable</p>
          <p className="mt-0.5 text-xs leading-5 opacity-80">
            Online payment is unavailable right now. Please contact us to
            arrange payment or choose cash on delivery for a new order.
          </p>
        </div>
      </div>
    );
  }

  const demo = paymentMode === "mock";
  const sandbox = paymentMode === "sandbox";

  return (
    <div className="rounded-2xl border border-gold/40 bg-amber-50/70 p-4 dark:border-gold/25 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <CreditCard className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-gold" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">Complete your payment</p>
            <Badge variant="gold">{label}</Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Amount due:{" "}
            <strong className="text-foreground">{formatNPR(amount)}</strong>.
            Your order is saved while payment is pending.
          </p>

          {demo ? (
            <>
              <p className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-[11px] leading-5 text-amber-900 dark:bg-black/20 dark:text-amber-100">
                Demo mode is active. No real money will move.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await mockPayAction(orderId, token);
                    if (result.success) {
                      toast.success(result.message);
                      router.refresh();
                    } else {
                      toast.error(result.message);
                    }
                  })
                }
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
                Simulate successful payment
              </Button>
            </>
          ) : (
            <>
              <p className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-[11px] leading-5 text-amber-900 dark:bg-black/20 dark:text-amber-100">
                {sandbox
                  ? `Sandbox gateway is active. Use your ${label} test account — no real money moves.`
                  : `You will be redirected to ${label} to complete the payment securely.`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <form
                  method="POST"
                  action={`/api/payments/${method === "ESEWA" ? "esewa" : "khalti"}/initiate`}
                >
                  <input type="hidden" name="orderId" value={orderId} />
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="orderNumber" value={orderNumber} />
                  <Button type="submit" size="sm">
                    <ShieldCheck className="size-4" />
                    {paymentStatus === "FAILED" ? "Try" : "Pay with"}{" "}
                    {method === "ESEWA" ? "eSewa" : "Khalti"}
                  </Button>
                </form>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={checking}
                  onClick={() =>
                    startChecking(async () => {
                      const result = await verifyOnlinePaymentAction(
                        orderId,
                        token,
                      );
                      if (result.success) {
                        toast.success(result.message);
                        router.refresh();
                      } else {
                        toast.error(result.message);
                      }
                    })
                  }
                >
                  {checking ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Check payment status
                </Button>
              </div>
              <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                <RefreshCw className="size-3" /> You will return here after
                payment.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
