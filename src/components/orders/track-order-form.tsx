"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, ReceiptText, Smartphone } from "lucide-react";
import { trackOrderAction } from "@/actions/orders";
import { trackOrderSchema } from "@/lib/validations";
import type { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

type TrackInput = z.infer<typeof trackOrderSchema>;

export function TrackOrderForm({ initialOrder }: { initialOrder?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const form = useForm<TrackInput>({
    resolver: zodResolver(trackOrderSchema),
    defaultValues: { orderNumber: initialOrder ?? "", phone: "" },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        setError("");
        startTransition(async () => {
          const result = await trackOrderAction(
            values.orderNumber,
            values.phone,
          );
          if (!result.success) {
            setError(result.message);
            return;
          }
          router.push(result.url);
        });
      })}
      className="space-y-4"
      noValidate
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <FormField
        label="Order number"
        htmlFor="orderNumber"
        error={form.formState.errors.orderNumber?.message}
        hint="Looks like PH-261019-ABCDE"
        required
      >
        <div className="relative">
          <ReceiptText className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="orderNumber"
            autoComplete="off"
            placeholder="PH-XXXXXXXX-XXXXX"
            className="pl-10 uppercase"
            {...form.register("orderNumber")}
          />
        </div>
      </FormField>
      <FormField
        label="Phone number used to order"
        htmlFor="phone"
        error={form.formState.errors.phone?.message}
        required
      >
        <div className="relative">
          <Smartphone className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="98XXXXXXXX"
            className="pl-10"
            {...form.register("phone")}
          />
        </div>
      </FormField>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Find my order <ArrowRight className="size-4" />
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Signed in?{" "}
        <Link
          href="/account/orders"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          See all your orders
        </Link>
      </p>
    </form>
  );
}
