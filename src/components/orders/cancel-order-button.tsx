"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cancelOrderAction } from "@/actions/orders";
import { CUSTOMER_CANCELLABLE, type OrderStatus } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";

export function CancelOrderButton({
  orderId,
  orderNumber,
  token,
  status,
}: {
  orderId: string;
  orderNumber: string;
  token: string | null;
  status: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  if (!CUSTOMER_CANCELLABLE.includes(status as OrderStatus)) {
    return null;
  }

  const cancel = () => {
    startTransition(async () => {
      const result = await cancelOrderAction(orderId, token, reason);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive">
          <XCircle className="size-4" /> Cancel order
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel order {orderNumber}?</DialogTitle>
          <DialogDescription>
            You can cancel before the kitchen starts preparing. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <FormField
          label="Reason for cancelling"
          htmlFor="cancel-reason"
          hint="Optional, but it helps our team improve."
        >
          <Textarea
            id="cancel-reason"
            value={reason}
            maxLength={300}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Changed my mind, ordered by mistake…"
          />
        </FormField>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Keep order
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={cancel}
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Cancel order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
