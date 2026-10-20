"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import {
  updateEventBookingStatusAction,
  updateReservationStatusAction,
} from "@/actions/admin/bookings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { BOOKING_STATUSES } from "@/lib/constants";

export function BookingStatusButton({
  kind,
  id,
  currentStatus,
  adminNotes,
  label,
}: {
  kind: "reservation" | "event";
  id: string;
  currentStatus: string;
  adminNotes: string | null;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(adminNotes ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="size-3.5" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {kind === "reservation" ? "Update reservation" : "Update event enquiry"}
            </DialogTitle>
            <DialogDescription>
              The customer is emailed when the status changes. Notes are internal only.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const input = { id, status: status as (typeof BOOKING_STATUSES)[number], adminNotes: notes };
                const result =
                  kind === "reservation"
                    ? await updateReservationStatusAction(input)
                    : await updateEventBookingStatusAction(input);
                if (result.success) {
                  toast.success(result.message);
                  setOpen(false);
                  router.refresh();
                } else {
                  toast.error(result.message);
                }
              });
            }}
          >
            <FormField label="Status" htmlFor="booking-status" required>
              <select
                id="booking-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {BOOKING_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item.charAt(0) + item.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label="Internal notes"
              htmlFor="booking-notes"
              hint="Share table assignments, deposits, dietary needs or follow-up details with the team."
            >
              <Textarea
                id="booking-notes"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={1000}
              />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Save update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
