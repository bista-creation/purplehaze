"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Flame,
  Loader2,
  MessageCircle,
  Phone,
  Printer,
  Sparkles,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  acceptOrderAction,
  declineOrderAction,
  updateOrderStatusAction,
} from "@/actions/admin/orders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function StaffOrderQuickActions({
  orderId,
  orderNumber,
  status,
  type,
  customerName,
  customerPhone,
  allowedAccept = true,
  blockedReason,
}: {
  orderId: string;
  orderNumber: string;
  status: string;
  type: string;
  customerName?: string | null;
  customerPhone?: string | null;
  allowedAccept?: boolean;
  blockedReason?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [prepTime, setPrepTime] = useState<number>(25);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const rawPhone = customerPhone || "";
  const cleanPhone = rawPhone.replace(/[^0-9+]/g, "");
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.replace("+", "")}?text=${encodeURIComponent(
        `Hello ${customerName || "Customer"}, greeting from Purple Haze Restro & Garden! Regarding your order ${orderNumber}...`,
      )}`
    : "";

  const handleQuickAccept = (timeMinutes = prepTime) => {
    startTransition(async () => {
      const result = await acceptOrderAction({
        orderId,
        note: `Order accepted by kitchen staff. Estimated preparation: ~${timeMinutes} minutes.`,
      });
      if (result.success) {
        toast.success(`Order ${orderNumber} accepted! Sent to kitchen.`);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      const result = await declineOrderAction(orderId, declineReason);
      if (result.success) {
        toast.success(`Order ${orderNumber} declined.`);
        setDeclineOpen(false);
        setDeclineReason("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleNextStatus = (
    nextStatus: "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED",
    note: string,
  ) => {
    startTransition(async () => {
      const result = await updateOrderStatusAction({
        orderId,
        status: nextStatus,
        note,
      });
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* PENDING STAGE */}
      {status === "PENDING" ? (
        <>
          <div className="flex items-center gap-1">
            {[15, 25, 35].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setPrepTime(mins)}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                  prepTime === mins
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                title={`Set prep time to ${mins} mins`}
              >
                {mins}m
              </button>
            ))}
          </div>

          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
            disabled={!allowedAccept || pending}
            title={allowedAccept ? `Accept order (~${prepTime}m prep)` : blockedReason}
            onClick={() => handleQuickAccept()}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            Quick Accept ({prepTime}m)
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            onClick={() => setDeclineOpen(true)}
            disabled={pending}
          >
            <XCircle className="size-3.5" /> Decline
          </Button>
        </>
      ) : null}

      {/* CONFIRMED STAGE */}
      {status === "CONFIRMED" ? (
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5 bg-amber-600 font-medium text-white hover:bg-amber-700"
          disabled={pending}
          onClick={() =>
            handleNextStatus(
              "PREPARING",
              "Kitchen started cooking and assembling your order.",
            )
          }
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Flame className="size-3.5" />
          )}
          Start Cooking
        </Button>
      ) : null}

      {/* PREPARING STAGE */}
      {status === "PREPARING" ? (
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5 bg-blue-600 font-medium text-white hover:bg-blue-700"
          disabled={pending}
          onClick={() =>
            handleNextStatus(
              "READY",
              "Dishes are hot, packed and ready for handover / delivery.",
            )
          }
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          Mark Ready
        </Button>
      ) : null}

      {/* READY STAGE */}
      {status === "READY" ? (
        type === "DELIVERY" ? (
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 bg-indigo-600 font-medium text-white hover:bg-indigo-700"
            disabled={pending}
            onClick={() =>
              handleNextStatus(
                "OUT_FOR_DELIVERY",
                "Order dispatched with delivery rider.",
              )
            }
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Truck className="size-3.5" />
            )}
            Send for Delivery
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 bg-emerald-600 font-medium text-white hover:bg-emerald-700"
            disabled={pending}
            onClick={() =>
              handleNextStatus(
                "COMPLETED",
                "Order handed over to customer. Completed.",
              )
            }
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            Complete Handover
          </Button>
        )
      ) : null}

      {/* OUT_FOR_DELIVERY STAGE */}
      {status === "OUT_FOR_DELIVERY" ? (
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5 bg-emerald-600 font-medium text-white hover:bg-emerald-700"
          disabled={pending}
          onClick={() =>
            handleNextStatus(
              "COMPLETED",
              "Successfully delivered to customer.",
            )
          }
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
          Mark Delivered
        </Button>
      ) : null}

      {/* PRINT KOT BUTTON (Available for all active kitchen orders) */}
      {["CONFIRMED", "PREPARING", "READY"].includes(status) ? (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
          title="Print Kitchen Order Ticket (KOT)"
        >
          <a
            href={`/print/kot/${encodeURIComponent(orderNumber)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Printer className="size-3.5" /> KOT
          </a>
        </Button>
      ) : null}

      {/* QUICK CUSTOMER CONTACT */}
      {cleanPhone ? (
        <>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-primary"
            title={`Call ${customerName || "Customer"} (${cleanPhone})`}
          >
            <a href={`tel:${cleanPhone}`}>
              <Phone className="size-3.5" />
            </a>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            title={`WhatsApp ${customerName || "Customer"}`}
          >
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-3.5" />
            </a>
          </Button>
        </>
      ) : null}

      <Button asChild variant="outline" size="sm" className="h-8 text-xs">
        <Link href={`/admin/orders/${orderId}`}>Detail</Link>
      </Button>

      {/* DECLINE DIALOG */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline {orderNumber}?</DialogTitle>
            <DialogDescription>
              Declining will cancel this order and record the reason in the audit
              log and customer email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="decline-reason"
              className="text-xs font-semibold text-foreground"
            >
              Reason for declining
            </label>
            <Textarea
              id="decline-reason"
              rows={3}
              placeholder="e.g. Kitchen is closed, or ingredient out of stock."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeclineOpen(false)}
              disabled={pending}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={handleDecline}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Decline order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
