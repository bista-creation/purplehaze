"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  LockKeyhole,
  MapPin,
  Percent,
  ShoppingBag,
  Store,
  Tag,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { createOrderAction, validateCouponAction } from "@/actions/orders";
import {
  checkoutDetailsSchema,
  type CheckoutDetailsInput,
} from "@/lib/validations";
import { calculateOrderTotals, formatNPR } from "@/lib/money";
import { cartSubtotal, useCartStore } from "@/lib/cart-store";
import { ORDER_TYPE_LABELS, type OrderType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ZoneOption {
  id: string;
  name: string;
  fee: number;
  minOrder: number;
}

interface DefaultAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
}

interface CheckoutUser {
  name: string | null;
  email: string;
  phone: string | null;
  defaultAddress: DefaultAddress | null;
}

const orderTypeOptions: Array<{
  type: OrderType;
  icon: typeof Bike;
  description: string;
}> = [
  {
    type: "DELIVERY",
    icon: Bike,
    description: "To your door in selected areas",
  },
  {
    type: "PICKUP",
    icon: ShoppingBag,
    description: "Collect from Airport Road",
  },
  {
    type: "DINE_IN",
    icon: Store,
    description: "Order ahead for your table",
  },
];

const subscribeToHydration = () => () => {};
const getHydrationSnapshot = () => true;
const getServerSnapshot = () => false;

export function CheckoutForm({
  zones,
  taxRate,
  serviceChargeRate,
  minDeliveryOrder,
  codEnabled,
  esewaEnabled,
  khaltiEnabled,
  user,
  paymentMode,
}: {
  zones: ZoneOption[];
  taxRate: number;
  serviceChargeRate: number;
  minDeliveryOrder: number;
  codEnabled: boolean;
  esewaEnabled: boolean;
  khaltiEnabled: boolean;
  user: CheckoutUser | null;
  paymentMode: string;
}) {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerSnapshot,
  );
  const [pending, startTransition] = useTransition();
  const [couponPending, startCouponTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const idempotencyKey = useRef<string>(globalThis.crypto.randomUUID());
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    description: string | null;
  } | null>(null);
  // Computed once on mount so render stays pure; the hint only needs a
  // near-future minimum.
  const [minScheduledAt] = useState(() =>
    new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16),
  );
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  const defaultType: OrderType = zones.length > 0 ? "DELIVERY" : "PICKUP";

  const form = useForm<CheckoutDetailsInput>({
    resolver: zodResolver(checkoutDetailsSchema),
    defaultValues: {
      customerName: user?.name ?? "",
      customerEmail: user?.email ?? "",
      customerPhone: user?.phone ?? "",
      type: defaultType,
      line1: user?.defaultAddress?.line1 ?? "",
      line2: user?.defaultAddress?.line2 ?? "",
      city: user?.defaultAddress?.city ?? "Biratnagar",
      state: user?.defaultAddress?.state ?? "Koshi",
      zoneId: zones[0]?.id ?? "",
      tableNumber: "",
      notes: "",
      paymentMethod: codEnabled
        ? "COD"
        : esewaEnabled
          ? "ESEWA"
          : khaltiEnabled
            ? "KHALTI"
            : "COD",
      couponCode: "",
      scheduledFor: "",
      saveAddress: Boolean(user?.defaultAddress),
    },
  });

  const type = useWatch({ control: form.control, name: "type" });
  const zoneId = useWatch({ control: form.control, name: "zoneId" });
  const paymentMethod = useWatch({
    control: form.control,
    name: "paymentMethod",
  });
  const couponInput = useWatch({ control: form.control, name: "couponCode" });
  const saveAddress = useWatch({ control: form.control, name: "saveAddress" });
  const zone = zones.find((item) => item.id === zoneId);
  const subtotal = cartSubtotal(items);
  const effectiveCoupon =
    appliedCoupon &&
    (couponInput ?? "").trim().toUpperCase() === appliedCoupon.code
      ? appliedCoupon
      : null;
  const totals = calculateOrderTotals({
    subtotal,
    deliveryFee: type === "DELIVERY" ? (zone?.fee ?? 0) : 0,
    discountAmount: effectiveCoupon?.discount ?? 0,
    taxRate,
    serviceChargeRate,
  });

  if (!mounted) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="h-[600px] animate-pulse rounded-2xl bg-muted" />
        <div className="h-[420px] animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="There is nothing to check out yet"
        description="Add a dish or two from the menu first. We will keep your table ready."
        actionLabel="Browse the menu"
        actionHref="/menu"
      />
    );
  }

  const applyCoupon = () => {
    const code = form.getValues("couponCode")?.trim() ?? "";
    if (!code) {
      toast.error("Enter a coupon code first.");
      return;
    }
    startCouponTransition(async () => {
      const result = await validateCouponAction(code, subtotal);
      if (!result.success) {
        setAppliedCoupon(null);
        toast.error(result.message);
        return;
      }
      setAppliedCoupon({
        code: result.code,
        discount: result.discount,
        description: result.description,
      });
      form.setValue("couponCode", result.code);
      toast.success(result.message);
    });
  };

  const onSubmit = (values: CheckoutDetailsInput) => {
    setServerError("");
    startTransition(async () => {
      const result = await createOrderAction({
        idempotencyKey: idempotencyKey.current,
        details: {
          ...values,
          couponCode: effectiveCoupon?.code ?? "",
          scheduledFor: values.scheduledFor || "",
        },
        items: items.map((item) => ({
          dishId: item.dishId,
          variantId: item.variantId,
          addOnIds: item.addOns.map((addOn) => addOn.id),
          quantity: item.quantity,
          instructions: item.instructions ?? "",
        })),
      });

      if (!result.success) {
        setServerError(result.message);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      clearCart();
      toast.success("Order placed. We have sent it to the kitchen.");
      router.push(result.confirmationUrl);
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    void form.handleSubmit(onSubmit)(event);
  };

  return (
    <form onSubmit={submit} noValidate>
      {serverError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Step 1
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold">
                  How would you like your order?
                </h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {orderTypeOptions.map((option) => {
                const disabled =
                  option.type === "DELIVERY" && zones.length === 0;
                return (
                  <label
                    key={option.type}
                    className={cn(
                      "relative flex cursor-pointer flex-col rounded-xl border p-4 transition",
                      type === option.type
                        ? "border-primary bg-secondary/50 shadow-sm"
                        : "hover:border-primary/40",
                      disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <input
                      type="radio"
                      value={option.type}
                      className="sr-only"
                      disabled={disabled}
                      {...form.register("type")}
                    />
                    <option.icon
                      className={cn(
                        "size-5",
                        type === option.type
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                    <span className="mt-3 text-sm font-semibold">
                      {ORDER_TYPE_LABELS[option.type]}
                    </span>
                    <span className="mt-1 text-[11px] leading-4 text-muted-foreground">
                      {option.description}
                    </span>
                    {type === option.type ? (
                      <CheckCircle2 className="absolute right-3 top-3 size-4 text-primary" />
                    ) : null}
                  </label>
                );
              })}
            </div>
            {type === "DELIVERY" && zone ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Delivery to {zone.name} · {formatNPR(zone.fee)}
                {zone.minOrder > 0
                  ? ` · minimum ${formatNPR(zone.minOrder)}`
                  : ""}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Step 2
              </p>
              <h2 className="font-display text-2xl font-semibold">
                Your details
              </h2>
              {!user ? (
                <p className="text-xs text-muted-foreground">
                  Checking out as a guest.{" "}
                  <Link
                    href={`/login?next=${encodeURIComponent("/checkout")}`}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>{" "}
                  to save this order to your account.
                </p>
              ) : null}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FormField
                label="Full name"
                htmlFor="customerName"
                error={form.formState.errors.customerName?.message}
                required
              >
                <Input
                  id="customerName"
                  autoComplete="name"
                  {...form.register("customerName")}
                />
              </FormField>
              <FormField
                label="Mobile number"
                htmlFor="customerPhone"
                error={form.formState.errors.customerPhone?.message}
                required
              >
                <Input
                  id="customerPhone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="98XXXXXXXX"
                  {...form.register("customerPhone")}
                />
              </FormField>
              <FormField
                label="Email address"
                htmlFor="customerEmail"
                error={form.formState.errors.customerEmail?.message}
                hint="Order confirmation and receipt go here."
                className="sm:col-span-2"
                required
              >
                <Input
                  id="customerEmail"
                  type="email"
                  autoComplete="email"
                  {...form.register("customerEmail")}
                />
              </FormField>
            </div>

            {type === "DELIVERY" ? (
              <div className="mt-5 space-y-4 border-t pt-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="size-4 text-primary" /> Delivery address
                </div>
                <FormField
                  label="Area"
                  htmlFor="zoneId"
                  error={form.formState.errors.zoneId?.message}
                  required
                >
                  <select
                    id="zoneId"
                    className="flex h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm shadow-xs focus:border-ring focus:ring-[3px] focus:ring-ring/20 focus:outline-none"
                    {...form.register("zoneId")}
                  >
                    <option value="">Choose your area</option>
                    {zones.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} — {formatNPR(item.fee)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  label="Street / landmark"
                  htmlFor="line1"
                  error={form.formState.errors.line1?.message}
                  required
                >
                  <Input
                    id="line1"
                    autoComplete="address-line1"
                    placeholder="House, street, landmark"
                    {...form.register("line1")}
                  />
                </FormField>
                <FormField
                  label="Apartment, floor or extra directions"
                  htmlFor="line2"
                  error={form.formState.errors.line2?.message}
                >
                  <Input
                    id="line2"
                    autoComplete="address-line2"
                    placeholder="Optional"
                    {...form.register("line2")}
                  />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="City"
                    htmlFor="city"
                    error={form.formState.errors.city?.message}
                    required
                  >
                    <Input
                      id="city"
                      autoComplete="address-level2"
                      {...form.register("city")}
                    />
                  </FormField>
                  <FormField
                    label="Province"
                    htmlFor="state"
                    error={form.formState.errors.state?.message}
                    required
                  >
                    <Input
                      id="state"
                      autoComplete="address-level1"
                      {...form.register("state")}
                    />
                  </FormField>
                </div>
                {user ? (
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
                    <Checkbox
                      checked={saveAddress === true}
                      onCheckedChange={(checked) =>
                        form.setValue("saveAddress", checked === true)
                      }
                    />
                    Save this address to my account
                  </label>
                ) : null}
              </div>
            ) : null}

            {type === "DINE_IN" ? (
              <div className="mt-5 border-t pt-5">
                <FormField
                  label="Table number"
                  htmlFor="tableNumber"
                  error={form.formState.errors.tableNumber?.message}
                  hint="Not at a table yet? Add “to be assigned” and our team will help."
                  required
                >
                  <Input
                    id="tableNumber"
                    placeholder="e.g. G-04"
                    {...form.register("tableNumber")}
                  />
                </FormField>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Step 3
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              Payment &amp; timing
            </h2>

            <fieldset className="mt-5">
              <legend className="text-sm font-semibold">Payment method</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {codEnabled ? (
                  <PaymentOption
                    value="COD"
                    current={paymentMethod}
                    icon={Wallet}
                    title="Cash"
                    description={
                      type === "DELIVERY"
                        ? "Pay on delivery"
                        : "Pay at the restaurant"
                    }
                    register={form.register("paymentMethod")}
                  />
                ) : null}
                {esewaEnabled ? (
                  <PaymentOption
                    value="ESEWA"
                    current={paymentMethod}
                    icon={CreditCard}
                    title="eSewa"
                    description={
                      paymentMode === "mock"
                        ? "Demo payment"
                        : paymentMode === "sandbox"
                          ? "Sandbox checkout"
                          : "Pay securely online"
                    }
                    register={form.register("paymentMethod")}
                  />
                ) : null}
                {khaltiEnabled ? (
                  <PaymentOption
                    value="KHALTI"
                    current={paymentMethod}
                    icon={CreditCard}
                    title="Khalti"
                    description={
                      paymentMode === "mock"
                        ? "Demo payment"
                        : paymentMode === "sandbox"
                          ? "Sandbox checkout"
                          : "Pay securely online"
                    }
                    register={form.register("paymentMethod")}
                  />
                ) : null}
              </div>
              {paymentMethod !== "COD" && paymentMode === "mock" ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Demo mode: you will be able to simulate a successful payment
                  on the order page. No real money moves.
                </p>
              ) : null}
              {paymentMethod !== "COD" && paymentMode === "sandbox" ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Sandbox mode: you will continue to the{" "}
                  {paymentMethod === "ESEWA" ? "eSewa" : "Khalti"} test
                  checkout. No real money moves. Use the provider&apos;s sandbox
                  test account.
                </p>
              ) : null}
            </fieldset>

            <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2">
              <FormField
                label="Schedule for later"
                htmlFor="scheduledFor"
                error={form.formState.errors.scheduledFor?.message}
                hint="Optional. Leave empty for as soon as possible."
              >
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  min={minScheduledAt}
                  {...form.register("scheduledFor")}
                />
              </FormField>
              <FormField
                label="Order note"
                htmlFor="notes"
                error={form.formState.errors.notes?.message}
                hint="Allergies, gate directions or occasion."
              >
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder="Anything the kitchen or team should know?"
                  {...form.register("notes")}
                />
              </FormField>
            </div>
          </section>

          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card/60 p-4 text-xs leading-5 text-muted-foreground">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <p>
              Your details are used to prepare and deliver this order. By
              placing it you agree to our{" "}
              <Link
                href="/terms"
                className="font-medium text-primary underline"
              >
                ordering terms
              </Link>
              . Refunds for online payments are handled manually by our team.
            </p>
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] lg:sticky lg:top-32">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Your order</h2>
            <Link
              href="/cart"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ArrowLeft className="size-3" /> Edit
            </Link>
          </div>

          <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
            {items.map((item) => (
              <li
                key={item.lineId}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    <span className="text-muted-foreground">
                      {item.quantity} ×{" "}
                    </span>
                    {item.name}
                  </p>
                  {item.variantName || item.addOns.length > 0 ? (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                      {[
                        item.variantName,
                        ...item.addOns.map((addOn) => addOn.name),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs font-semibold">
                  {formatNPR(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t pt-4">
            <Label htmlFor="couponCode" className="text-xs">
              Coupon code
            </Label>
            <div className="mt-1.5 flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="couponCode"
                  placeholder="GARDEN10"
                  className="h-10 pl-8 uppercase"
                  {...form.register("couponCode")}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10"
                onClick={applyCoupon}
                disabled={couponPending}
              >
                {couponPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
            {effectiveCoupon ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <Percent className="size-3.5" />
                {effectiveCoupon.code} applied — saving{" "}
                {formatNPR(effectiveCoupon.discount)}
              </p>
            ) : null}
          </div>

          <Separator className="my-4" />
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatNPR(totals.subtotal)}</dd>
            </div>
            {totals.discountAmount > 0 ? (
              <div className="flex justify-between gap-3 text-emerald-700 dark:text-emerald-300">
                <dt>Coupon discount</dt>
                <dd>-{formatNPR(totals.discountAmount)}</dd>
              </div>
            ) : null}
            {totals.serviceCharge > 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Service charge</dt>
                <dd>{formatNPR(totals.serviceCharge)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">VAT ({taxRate}%)</dt>
              <dd>{formatNPR(totals.taxAmount)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">
                {type === "DELIVERY" ? "Delivery" : "Fulfilment"}
              </dt>
              <dd>
                {type === "DELIVERY"
                  ? zone
                    ? formatNPR(zone.fee)
                    : "Choose area"
                  : "No charge"}
              </dd>
            </div>
            <Separator />
            <div className="flex justify-between gap-3 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatNPR(totals.total)}</dd>
            </div>
          </dl>

          {type === "DELIVERY" &&
          minDeliveryOrder > 0 &&
          subtotal < minDeliveryOrder ? (
            <Alert variant="warning" className="mt-4">
              <AlertDescription>
                Delivery orders start at {formatNPR(minDeliveryOrder)}. Add{" "}
                {formatNPR(minDeliveryOrder - subtotal)} more or choose pickup.
              </AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Place order · {formatNPR(totals.total)}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="size-3.5" /> Usually ready in about{" "}
            {items.length > 0 ? "25–35" : "30"} minutes
          </p>
          {paymentMethod !== "COD" ? (
            <Badge
              variant="muted"
              className="mt-3 w-full justify-center py-1.5"
            >
              {paymentMethod === "ESEWA" ? "eSewa" : "Khalti"} ·{" "}
              {paymentMode === "mock"
                ? "demo"
                : paymentMode === "sandbox"
                  ? "sandbox"
                  : "secure"}{" "}
              payment
            </Badge>
          ) : null}
        </aside>
      </div>
    </form>
  );
}

function PaymentOption({
  value,
  current,
  icon: Icon,
  title,
  description,
  register,
}: {
  value: string;
  current: string;
  icon: typeof Wallet;
  title: string;
  description: string;
  register: UseFormRegisterReturn<"paymentMethod">;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer gap-3 rounded-xl border p-3.5 transition",
        current === value
          ? "border-primary bg-secondary/50"
          : "hover:border-primary/40",
      )}
    >
      <input type="radio" value={value} className="sr-only" {...register} />
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          current === value ? "text-primary" : "text-muted-foreground",
        )}
      />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
          {description}
        </p>
      </div>
    </label>
  );
}
