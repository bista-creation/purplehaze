"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { acceptOrderAction } from "@/actions/admin/orders";
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

export function AcceptOrderPanel({
  orderId,
  allowed,
  reason,
  paymentLabel,
  paymentDetail,
  cashDue,
  serviceSummary,
  totalLabel,
}: {
  orderId: string;
  allowed: boolean;
  reason?: string;
  paymentLabel: string;
  paymentDetail: string;
  cashDue: boolean;
  serviceSummary: string;
  totalLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  if (!allowed) {
    return (
      <div className="rounded-xl border border-amber-300/70 bg-amber-50 p-3 text-[11px] leading-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="flex items-center gap-1.5 font-semibold">
          <ShieldAlert className="size-3.5" /> Acceptance blocked
        </p>
        <p className="mt-1">{reason ?? "This order cannot be accepted yet."}</p>
        <p className="mt-2 font-medium">{paymentDetail}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] leading-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <p className="font-semibold">Ready to accept</p>
        <p className="mt-1">{paymentDetail}</p>
        {cashDue ? (
          <p className="mt-1 font-semibold">
            Cash is still due. Collect it at handover and only then record
            payment.
          </p>
        ) : null}
      </div>
      <div>
        <label
          htmlFor="accept-order-note"
          className="mb-1.5 block text-xs font-semibold"
        >
          Acceptance note{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="accept-order-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder="e.g. Customer confirmed the delivery address by phone."
        />
      </div>
      <Button type="button" className="w-full" onClick={() => setOpen(true)}>
        <CheckCircle2 className="size-4" />
        {cashDue ? "Accept order — cash due" : "Accept paid order"}
      </Button>
      <p className="text-[11px] leading-5 text-muted-foreground">
        Accepting moves the order to confirmed and starts the kitchen workflow.
        The customer receives one confirmation email.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accept this order?</DialogTitle>
            <DialogDescription>
              Review the service and payment state before confirming.
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
              <dd className="text-right font-semibold">{totalLabel}</dd>
            </div>
          </dl>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Not yet
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await acceptOrderAction({ orderId, note });
                  if (result.success) {
                    toast.success(result.message);
                    setOpen(false);
                    setNote("");
                    router.refresh();
                  } else {
                    toast.error(result.message);
                  }
                });
              }}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Accept order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
