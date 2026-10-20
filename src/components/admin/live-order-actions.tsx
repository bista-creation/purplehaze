"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { acceptOrderAction, declineOrderAction } from "@/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LiveOrderActions({
  orderId,
  orderNumber,
  serviceSummary,
  paymentLabel,
  paymentDetail,
  totalLabel,
  cashDue,
  allowed,
  blockedReason,
}: {
  orderId: string;
  orderNumber: string;
  serviceSummary: string;
  paymentLabel: string;
  paymentDetail: string;
  totalLabel: string;
  cashDue: boolean;
  allowed: boolean;
  blockedReason?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"accept" | "decline" | null>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (action: "accept" | "decline") => {
    startTransition(async () => {
      const result =
        action === "accept"
          ? await acceptOrderAction({ orderId, note: "" })
          : await declineOrderAction(orderId, reason);
      if (result.success) {
        toast.success(result.message);
        setMode(null);
        setReason("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button asChild variant="outline" size="sm" className="h-8">
        <Link href={`/admin/orders/${orderId}`}>Review</Link>
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-8"
        disabled={!allowed}
        title={allowed ? undefined : blockedReason}
        onClick={() => setMode("accept")}
      >
        <CheckCircle2 className="size-3.5" /> Accept
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
        onClick={() => setMode("decline")}
      >
        <XCircle className="size-3.5" /> Decline
      </Button>

      <Dialog
        open={mode === "accept"}
        onOpenChange={(open) => setMode(open ? "accept" : null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accept {orderNumber}?</DialogTitle>
            <DialogDescription>
              Confirm the service and payment state before starting preparation.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-2 rounded-xl bg-muted/60 p-3 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Service</dt>
              <dd className="text-right font-medium">{serviceSummary}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Payment</dt>
              <dd className="text-right font-medium">{paymentLabel}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold">{totalLabel}</dd>
            </div>
          </dl>
          <p className="text-[11px] leading-5 text-muted-foreground">
            {paymentDetail}
            {cashDue
              ? " Cash remains due at handover; record it only after collection."
              : ""}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => run("accept")}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Accept order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={mode === "decline"}
        onOpenChange={(open) => setMode(open ? "decline" : null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline {orderNumber}?</DialogTitle>
            <DialogDescription>
              This cancels the pending order. The customer is emailed once. Any
              verified payment must be refunded manually.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label
              htmlFor={`decline-reason-${orderId}`}
              className="mb-1.5 block text-xs font-semibold"
            >
              Reason for the timeline{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Textarea
              id={`decline-reason-${orderId}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              maxLength={300}
              placeholder="e.g. Kitchen is closed for maintenance."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode(null)}
              disabled={pending}
            >
              Keep order
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => run("decline")}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Decline order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
