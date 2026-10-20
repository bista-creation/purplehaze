"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatusAction } from "@/actions/admin/orders";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ORDER_STATUS_FLOW,
  STATUS_META,
  type OrderStatus,
} from "@/lib/constants";

export function OrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const allowed = ORDER_STATUS_FLOW[currentStatus as OrderStatus] ?? [];
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const status =
    selectedStatus && (allowed as readonly string[]).includes(selectedStatus)
      ? selectedStatus
      : (allowed[0] ?? "");
  const [note, setNote] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, startTransition] = useTransition();

  if (currentStatus === "PENDING") {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-xs leading-5 text-muted-foreground">
        Use the <strong>Accept order</strong> panel above after reviewing the
        service and payment state. To decline the order, use the decline action
        on the live orders board.
      </p>
    );
  }

  if (allowed.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-xs leading-5 text-muted-foreground">
        This order is closed. No further status changes are available.
      </p>
    );
  }

  const submit = () =>
    startTransition(async () => {
      const result = await updateOrderStatusAction({
        orderId,
        status: status as OrderStatus,
        note,
      });
      if (result.success) {
        toast.success(result.message);
        setNote("");
        setSelectedStatus(null);
        setConfirmCancel(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });

  const requestUpdate = () => {
    if (status === "CANCELLED") {
      setConfirmCancel(true);
      return;
    }
    submit();
  };

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="admin-order-status"
          className="mb-1.5 block text-xs font-semibold"
        >
          Move order to
        </label>
        <Select value={status} onValueChange={setSelectedStatus}>
          <SelectTrigger id="admin-order-status">
            <SelectValue placeholder="Choose next status" />
          </SelectTrigger>
          <SelectContent>
            {allowed.map((next) => (
              <SelectItem key={next} value={next}>
                {STATUS_META[next].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label
          htmlFor="admin-order-note"
          className="mb-1.5 block text-xs font-semibold"
        >
          Note for the timeline{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="admin-order-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder="e.g. Called the customer to confirm the address."
        />
      </div>
      <Button
        type="button"
        className="w-full"
        disabled={pending || !status}
        onClick={requestUpdate}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ArrowRight className="size-4" />
        )}
        Update status
      </Button>
      <p className="text-[11px] leading-5 text-muted-foreground">
        The customer is emailed automatically when the status changes.
        Cancelling a paid order leaves it marked paid and flags a refund; an
        admin records the refund only after completing it in the payment
        provider or at the counter.
      </p>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>
              This is final. The customer is emailed once. If the order is paid,
              an admin must complete and record the refund separately.
            </DialogDescription>
          </DialogHeader>
          {note.trim() ? (
            <p className="rounded-xl bg-muted/60 p-3 text-xs">
              <span className="font-semibold">Timeline note:</span> {note}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmCancel(false)}
              disabled={pending}
            >
              Keep order
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={submit}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
