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
import { useForm, useWatch, type UseFormRegisterReturn, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Bike,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  LockKeyhole,
  MapPin,
  Percent,
  ShoppingBag,
  Sparkles,
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
  const [redirectingGateway, setRedirectingGateway] = useState<string | null>(null);
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
  const setCartOpen = useCartStore((state) => state.setCartOpen);

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
      loyaltyPointsToRedeem: 0,
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
  const watchedCustomerName = useWatch({ control: form.control, name: "customerName" });
  const watchedLine1 = useWatch({ control: form.control, name: "line1" });
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
        actionOnClick={() => setCartOpen(false)}
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
          loyaltyPointsToRedeem: values.loyaltyPointsToRedeem ?? 0,
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

      // If online payment (Khalti or eSewa), preserve cart and smoothly redirect to gateway
      if (result.digitalPayment && result.orderId && result.publicToken) {
        const providerName =
          values.paymentMethod === "ESEWA" ? "eSewa" : "Khalti";
        setRedirectingGateway(providerName);
        toast.info(`Connecting to ${providerName} secure checkout...`);

        const formEl = document.createElement("form");
        formEl.method = "POST";
        formEl.action = `/api/payments/${values.paymentMethod.toLowerCase()}/initiate`;

        const inputOrderId = document.createElement("input");
        inputOrderId.type = "hidden";
        inputOrderId.name = "orderId";
        inputOrderId.value = result.orderId;
        formEl.appendChild(inputOrderId);

        const inputToken = document.createElement("input");
        inputToken.type = "hidden";
        inputToken.name = "token";
        inputToken.value = result.publicToken;
        formEl.appendChild(inputToken);

        const inputNumber = document.createElement("input");
        inputNumber.type = "hidden";
        inputNumber.name = "orderNumber";
        inputNumber.value = result.orderNumber;
        formEl.appendChild(inputNumber);

        document.body.appendChild(formEl);
        formEl.submit();
        return;
      }

      clearCart();
      toast.success("Order placed. We have sent it to the kitchen.");
      router.push(result.confirmationUrl);
    });
  };

  const onInvalid = (errors: FieldErrors<CheckoutDetailsInput>) => {
    const missingName = Boolean(errors.customerName);
    const missingAddress = type === "DELIVERY" && Boolean(errors.line1);
    const missingPhone = Boolean(errors.customerPhone);

    if (missingName && missingAddress) {
      toast.error("Please enter your name and delivery address to continue.", {
        description: "We need your name for the kitchen and address for our delivery rider.",
      });
    } else if (missingName) {
      toast.error("Please enter your full name.", {
        description: "So we know who to prepare and hand this order to.",
      });
    } else if (missingAddress) {
      toast.error("Please enter your delivery street or landmark.", {
        description: "Our rider needs your address to deliver your order quickly.",
      });
    } else if (missingPhone) {
      toast.error("Please enter a valid mobile number.", {
        description: "In case our rider needs directions to reach you.",
      });
    } else {
      toast.error("Please complete the required details above to place your order.");
    }

    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey) {
      const element = document.getElementById(firstErrorKey);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.focus({ preventScroll: true });
      }
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    void form.handleSubmit(onSubmit, onInvalid)(event);
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
                hint="💡 Let us know who to prepare and hand this order to."
                required
              >
                <Input
                  id="customerName"
                  autoComplete="name"
                  placeholder="Your full name"
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
                  hint="💡 Detailed street, house number or landmark ensures swift delivery."
                  required
                >
                  <Input
                    id="line1"
                    autoComplete="address-line1"
                    placeholder="House, street, landmark (e.g. Near Airport Road)"
                    {...form.register("line1")}
                  />
                </FormField>
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Sparkles className="size-3 text-amber-500" />
                    <span>Popular Biratnagar areas (tap to auto-fill):</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Airport Road",
                      "Traffic Chowk",
                      "Roadcess Chowk",
                      "Bargachhi",
                      "Tintoliya",
                      "Hospital Chowk",
                      "Main Road",
                      "Kanchanbari",
                    ].map((landmark) => (
                      <button
                        key={landmark}
                        type="button"
                        onClick={() => {
                          form.setValue("line1", landmark, { shouldValidate: true, shouldDirty: true });
                        }}
                        className="inline-flex items-center rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-secondary-foreground transition hover:border-primary hover:bg-primary/10 hover:text-primary active:scale-95"
                      >
                        + {landmark}
                      </button>
                    ))}
                  </div>
                </div>
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
              <div className="flex items-center justify-between">
                <legend className="text-sm font-semibold">Payment method</legend>
                {paymentMode === "sandbox" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <Sparkles className="size-3" /> Sandbox Mode Active
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {codEnabled ? (
                  <PaymentOption
                    value="COD"
                    current={paymentMethod}
                    icon={Wallet}
                    title="Cash"
                    description={
                      type === "DELIVERY"
                        ? "Pay on delivery"
                        : "Pay at restaurant"
                    }
                    badgeText="Cash"
                    accentColor="primary"
                    register={form.register("paymentMethod")}
                  />
                ) : null}
                {esewaEnabled ? (
                  <PaymentOption
                    value="ESEWA"
                    current={paymentMethod}
                    customIcon={<EsewaIcon />}
                    title="eSewa"
                    description="Instant wallet / mobile payment"
                    badgeText={paymentMode === "sandbox" ? "Sandbox" : "Instant"}
                    accentColor="green"
                    register={form.register("paymentMethod")}
                  />
                ) : null}
                {khaltiEnabled ? (
                  <PaymentOption
                    value="KHALTI"
                    current={paymentMethod}
                    customIcon={<KhaltiIcon />}
                    title="Khalti"
                    description="Khalti wallet, e-Banking & Cards"
                    badgeText={paymentMode === "sandbox" ? "Sandbox" : "Instant"}
                    accentColor="purple"
                    register={form.register("paymentMethod")}
                  />
                ) : null}
              </div>

              {paymentMethod !== "COD" && paymentMode === "sandbox" ? (
                <SandboxCredentialsHelper method={paymentMethod} />
              ) : null}

              {paymentMethod !== "COD" && paymentMode === "mock" ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Demo mode: you will be able to simulate a successful payment
                  on the order page. No real money moves.
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
                href="/terms-and-conditions"
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

          {(!watchedCustomerName || (type === "DELIVERY" && !watchedLine1)) && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200/90 flex items-start gap-2.5">
              <Sparkles className="size-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-300">Almost ready to order!</p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {!watchedCustomerName && (type === "DELIVERY" && !watchedLine1)
                    ? "Please add your name and delivery address so our kitchen and rider can serve you smoothly."
                    : !watchedCustomerName
                      ? "Please add your name so our kitchen knows who to hand this meal to."
                      : "Please add your street or landmark address so our rider can deliver to your doorstep."}
                </p>
              </div>
            </div>
          )}

          {paymentMethod === "COD" ? (
            <Button
              type="submit"
              size="lg"
              className="mt-5 w-full font-semibold shadow-md transition-all active:scale-[0.99]"
              disabled={pending || Boolean(redirectingGateway)}
            >
              {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Place Order (Cash) · {formatNPR(totals.total)}
            </Button>
          ) : paymentMethod === "ESEWA" ? (
            <Button
              type="submit"
              size="lg"
              className="mt-5 w-full bg-[#10b981] hover:bg-[#059669] text-white font-semibold shadow-md transition-all active:scale-[0.99]"
              disabled={pending || Boolean(redirectingGateway)}
            >
              {pending || redirectingGateway ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <div className="mr-2 shrink-0">
                  <EsewaIcon />
                </div>
              )}
              Pay with eSewa · {formatNPR(totals.total)}
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              className="mt-5 w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold shadow-md transition-all active:scale-[0.99]"
              disabled={pending || Boolean(redirectingGateway)}
            >
              {pending || redirectingGateway ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <div className="mr-2 shrink-0">
                  <KhaltiIcon />
                </div>
              )}
              Pay with Khalti · {formatNPR(totals.total)}
            </Button>
          )}

          <p className="mt-3 text-center text-[11px] text-muted-foreground leading-relaxed">
            {paymentMethod === "COD"
              ? "Cash will be collected when your food is handed over."
              : `Your order is sent to the kitchen immediately after ${paymentMethod === "ESEWA" ? "eSewa" : "Khalti"} payment is confirmed.`}
          </p>

          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="size-3.5" /> Usually ready in about{" "}
            {items.length > 0 ? "25–35" : "30"} minutes
          </p>
        </aside>
      </div>

      {redirectingGateway ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="size-8 animate-spin" />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold">
              Connecting to {redirectingGateway}...
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              We are securely transferring you to {redirectingGateway} to complete your payment.
            </p>
            <div className="mt-5 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
              Your order will be sent to the kitchen immediately once payment is verified.
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function PaymentOption({
  value,
  current,
  icon: Icon,
  customIcon,
  title,
  description,
  badgeText,
  accentColor = "primary",
  register,
}: {
  value: string;
  current: string;
  icon?: typeof Wallet;
  customIcon?: React.ReactNode;
  title: string;
  description: string;
  badgeText?: string;
  accentColor?: "green" | "purple" | "primary";
  register: UseFormRegisterReturn<"paymentMethod">;
}) {
  const isSelected = current === value;
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 sm:p-4 transition-all duration-150 select-none",
        isSelected
          ? accentColor === "green"
            ? "border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500/40 dark:bg-emerald-950/20"
            : accentColor === "purple"
              ? "border-purple-500 bg-purple-50/50 shadow-sm ring-1 ring-purple-500/40 dark:bg-purple-950/20"
              : "border-primary bg-secondary/60 shadow-sm ring-1 ring-primary/40"
          : "border-border/80 hover:border-primary/50 bg-card hover:bg-muted/30",
      )}
    >
      <input type="radio" value={value} className="sr-only" {...register} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {customIcon ? (
            customIcon
          ) : Icon ? (
            <div
              className={cn(
                "grid size-6 place-items-center rounded-md",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-3.5" />
            </div>
          ) : null}
          <p className="font-semibold text-sm leading-tight">{title}</p>
        </div>
        <div
          className={cn(
            "grid size-4 place-items-center rounded-full border transition",
            isSelected
              ? accentColor === "green"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : accentColor === "purple"
                  ? "border-purple-600 bg-purple-600 text-white"
                  : "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40 bg-transparent",
          )}
        >
          {isSelected ? <Check className="size-2.5 stroke-[3]" /> : null}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-[11px] leading-4 text-muted-foreground">{description}</p>
        {badgeText ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
              isSelected
                ? accentColor === "green"
                  ? "bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200"
                  : accentColor === "purple"
                    ? "bg-purple-200/80 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200"
                    : "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {badgeText}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function EsewaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" aria-label="eSewa">
      <circle cx="12" cy="12" r="10" fill="#60BB46" />
      <text
        x="12"
        y="16.5"
        fill="#FFFFFF"
        fontSize="13"
        fontWeight="900"
        textAnchor="middle"
        fontFamily="sans-serif"
      >
        e
      </text>
    </svg>
  );
}

function KhaltiIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" aria-label="Khalti">
      <rect width="24" height="24" rx="5" fill="#5D2E8E" />
      <text
        x="12"
        y="16.5"
        fill="#FFFFFF"
        fontSize="13"
        fontWeight="900"
        textAnchor="middle"
        fontFamily="sans-serif"
      >
        K
      </text>
    </svg>
  );
}

function SandboxCredentialsHelper({ method }: { method: string }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, value: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(value);
    }
    setCopiedKey(key);
    toast.success(`Copied ${key}: ${value}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (method === "ESEWA") {
    return (
      <div className="mt-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50/60 p-4 text-xs dark:border-emerald-500/20 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
            <Sparkles className="size-3.5 text-emerald-600" />
            <span>eSewa Sandbox Test Mode Active</span>
          </div>
          <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-700 dark:text-emerald-400">
            Test Money Only
          </Badge>
        </div>
        <p className="mt-1 text-[11px] text-emerald-900/80 dark:text-emerald-200/80">
          No real funds are deducted. Use eSewa&apos;s official test credentials to log in:
        </p>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-background/80 px-2.5 py-1.5 shadow-xs">
            <div>
              <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">eSewa ID</span>
              <span className="font-mono font-medium text-foreground">9800000000</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleCopy("eSewa ID", "9800000000")}
              title="Copy eSewa ID"
            >
              {copiedKey === "eSewa ID" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-background/80 px-2.5 py-1.5 shadow-xs">
            <div>
              <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">Password/MPIN</span>
              <span className="font-mono font-medium text-foreground">1122</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleCopy("Password", "1122")}
              title="Copy Password"
            >
              {copiedKey === "Password" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-background/80 px-2.5 py-1.5 shadow-xs">
            <div>
              <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">Token / OTP</span>
              <span className="font-mono font-medium text-foreground">123456</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleCopy("Token", "123456")}
              title="Copy Token"
            >
              {copiedKey === "Token" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (method === "KHALTI") {
    return (
      <div className="mt-3.5 rounded-xl border border-purple-500/30 bg-purple-50/60 p-4 text-xs dark:border-purple-500/20 dark:bg-purple-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-purple-800 dark:text-purple-300">
            <Sparkles className="size-3.5 text-purple-600" />
            <span>Khalti Sandbox Test Mode Active</span>
          </div>
          <Badge variant="outline" className="border-purple-500/40 text-[10px] text-purple-700 dark:text-purple-400">
            Test Money Only
          </Badge>
        </div>
        <p className="mt-1 text-[11px] text-purple-900/80 dark:text-purple-200/80">
          No real funds are deducted. Use Khalti&apos;s official test credentials to confirm:
        </p>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg border border-purple-500/20 bg-background/80 px-2.5 py-1.5 shadow-xs">
            <div>
              <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">Khalti ID</span>
              <span className="font-mono font-medium text-foreground">9800000000</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleCopy("Khalti ID", "9800000000")}
              title="Copy Khalti ID"
            >
              {copiedKey === "Khalti ID" ? <Check className="size-3 text-purple-600" /> : <Copy className="size-3" />}
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-purple-500/20 bg-background/80 px-2.5 py-1.5 shadow-xs">
            <div>
              <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">MPIN</span>
              <span className="font-mono font-medium text-foreground">1111</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleCopy("MPIN", "1111")}
              title="Copy MPIN"
            >
              {copiedKey === "MPIN" ? <Check className="size-3 text-purple-600" /> : <Copy className="size-3" />}
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-purple-500/20 bg-background/80 px-2.5 py-1.5 shadow-xs">
            <div>
              <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">OTP</span>
              <span className="font-mono font-medium text-foreground">987654</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleCopy("OTP", "987654")}
              title="Copy OTP"
            >
              {copiedKey === "OTP" ? <Check className="size-3 text-purple-600" /> : <Copy className="size-3" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
