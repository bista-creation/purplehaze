"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, Loader2, Plus, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import {
  deleteCouponAction,
  saveCouponAction,
} from "@/actions/admin/catalogue";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { couponAdminSchema, type CouponAdminInput } from "@/lib/validations";
import { formatNPR, paisaToRupees } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";

export type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
};

function couponState(coupon: CouponRow) {
  const now = Date.now();
  if (!coupon.isActive) return { label: "Inactive", variant: "muted" as const };
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) {
    return { label: "Scheduled", variant: "blue" as const };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) {
    return { label: "Expired", variant: "red" as const };
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return { label: "Used up", variant: "muted" as const };
  }
  return { label: "Active", variant: "green" as const };
}

export function CouponAdmin({ coupons }: { coupons: CouponRow[] }) {
  const [dialog, setDialog] = useState<{ open: boolean; coupon?: CouponRow }>({
    open: false,
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => setDialog({ open: true })}>
          <Plus className="size-4" /> Create coupon
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Offer</th>
                <th className="px-4 py-3 font-semibold">Minimum</th>
                <th className="px-4 py-3 font-semibold">Uses</th>
                <th className="px-4 py-3 font-semibold">Window</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {coupons.map((coupon) => {
                const state = couponState(coupon);
                return (
                  <tr key={coupon.id}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-primary">
                        {coupon.code}
                      </p>
                      <p className="max-w-[14rem] truncate text-[11px] text-muted-foreground">
                        {coupon.description || "No description"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">
                        {coupon.type === "PERCENT"
                          ? `${coupon.value}% off`
                          : `${formatNPR(coupon.value)} off`}
                      </p>
                      {coupon.maxDiscount ? (
                        <p className="text-[10px] text-muted-foreground">
                          up to {formatNPR(coupon.maxDiscount)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {coupon.minOrder ? formatNPR(coupon.minOrder) : "None"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {coupon.usedCount}
                      {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                    </td>
                    <td className="px-4 py-3 text-[10px] leading-5 text-muted-foreground">
                      {coupon.startsAt
                        ? `From ${formatDateTime(coupon.startsAt)}`
                        : "Starts now"}
                      <br />
                      {coupon.expiresAt
                        ? `Until ${formatDateTime(coupon.expiresAt)}`
                        : "No expiry"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={state.variant}>{state.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${coupon.code}`}
                          onClick={() => setDialog({ open: true, coupon })}
                        >
                          <Edit3 className="size-3.5" />
                        </Button>
                        <ConfirmActionButton
                          action={deleteCouponAction.bind(null, coupon.id)}
                          label=""
                          title={`Delete ${coupon.code}?`}
                          description="Orders that already used this coupon keep their discount. Deactivate the coupon instead if you want an audit trail."
                          confirmLabel="Delete coupon"
                          variant="ghost"
                          size="icon-sm"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {coupons.length === 0 ? (
          <div className="p-10 text-center">
            <TicketPercent className="mx-auto size-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium">No coupons yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a welcome offer or a quiet-weekday discount.
            </p>
          </div>
        ) : null}
      </div>

      {dialog.open ? (
        <CouponDialog
          key={dialog.coupon?.id ?? "new-coupon"}
          coupon={dialog.coupon}
          onClose={() => setDialog({ open: false })}
        />
      ) : null}
    </div>
  );
}

function CouponDialog({
  coupon,
  onClose,
}: {
  coupon?: CouponRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<CouponAdminInput>({
    resolver: zodResolver(couponAdminSchema),
    defaultValues: {
      code: coupon?.code ?? "",
      description: coupon?.description ?? "",
      type: (coupon?.type as "PERCENT" | "FIXED") ?? "PERCENT",
      value:
        coupon?.type === "FIXED"
          ? paisaToRupees(coupon.value)
          : (coupon?.value ?? 10),
      minOrder: coupon ? paisaToRupees(coupon.minOrder) : 0,
      maxDiscount: coupon?.maxDiscount ? paisaToRupees(coupon.maxDiscount) : 0,
      maxUses: coupon?.maxUses ?? 0,
      startsAt: coupon?.startsAt ? toNepalInput(coupon.startsAt) : "",
      expiresAt: coupon?.expiresAt ? toNepalInput(coupon.expiresAt) : "",
      isActive: coupon?.isActive ?? true,
    },
  });
  const type = useWatch({ control: form.control, name: "type" });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {coupon ? `Edit ${coupon.code}` : "Create a coupon"}
          </DialogTitle>
          <DialogDescription>
            Limits are enforced when a customer applies the code at checkout.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await saveCouponAction(values, coupon?.id);
              if (result.success) {
                toast.success(result.message);
                router.refresh();
                onClose();
              } else {
                toast.error(result.message);
              }
            });
          })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Coupon code"
              htmlFor="coupon-code"
              required
              error={form.formState.errors.code?.message}
              hint="Letters, numbers, dash and underscore. Case-insensitive."
            >
              <Input
                id="coupon-code"
                className="font-mono uppercase"
                {...form.register("code")}
              />
            </FormField>
            <FormField label="Type" htmlFor="coupon-type" required>
              <select
                id="coupon-type"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                {...form.register("type")}
              >
                <option value="PERCENT">Percentage discount</option>
                <option value="FIXED">Fixed NPR discount</option>
              </select>
            </FormField>
          </div>
          <FormField
            label="Description"
            htmlFor="coupon-description"
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id="coupon-description"
              rows={2}
              placeholder="A short, customer-facing explanation."
              {...form.register("description")}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={type === "PERCENT" ? "Percentage off" : "Discount (NPR)"}
              htmlFor="coupon-value"
              required
              error={form.formState.errors.value?.message}
            >
              <Input
                id="coupon-value"
                type="number"
                min="0"
                step={type === "PERCENT" ? "1" : "0.01"}
                {...form.register("value")}
              />
            </FormField>
            <FormField
              label="Minimum order (NPR)"
              htmlFor="coupon-min"
              error={form.formState.errors.minOrder?.message}
            >
              <Input
                id="coupon-min"
                type="number"
                min="0"
                step="0.01"
                {...form.register("minOrder")}
              />
            </FormField>
          </div>
          {type === "PERCENT" ? (
            <FormField
              label="Maximum discount (NPR)"
              htmlFor="coupon-max"
              error={form.formState.errors.maxDiscount?.message}
              hint="Leave zero for no cap."
            >
              <Input
                id="coupon-max"
                type="number"
                min="0"
                step="0.01"
                {...form.register("maxDiscount")}
              />
            </FormField>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="Maximum uses"
              htmlFor="coupon-uses"
              error={form.formState.errors.maxUses?.message}
              hint="0 = unlimited."
            >
              <Input
                id="coupon-uses"
                type="number"
                min="0"
                {...form.register("maxUses")}
              />
            </FormField>
            <FormField
              label="Starts (Nepal)"
              htmlFor="coupon-start"
              error={form.formState.errors.startsAt?.message}
            >
              <Input
                id="coupon-start"
                type="datetime-local"
                {...form.register("startsAt")}
              />
            </FormField>
            <FormField
              label="Expires (Nepal)"
              htmlFor="coupon-end"
              error={form.formState.errors.expiresAt?.message}
            >
              <Input
                id="coupon-end"
                type="datetime-local"
                {...form.register("expiresAt")}
              />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              {...form.register("isActive")}
            />
            Coupon is active
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save coupon
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toNepalInput(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}
