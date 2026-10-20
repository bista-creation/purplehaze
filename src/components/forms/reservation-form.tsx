"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Phone,
  UserRound,
  UsersRound,
} from "lucide-react";
import { submitReservationAction } from "@/actions/public";
import {
  reservationSchema,
  type ReservationInput,
} from "@/lib/validations";
import { TIME_SLOTS } from "@/lib/constants";
import { formatDateLong } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ReservationForm({ minDate }: { minDate: string }) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState<ReservationInput | null>(null);
  const form = useForm<ReservationInput>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      date: "",
      time: "7:00 PM",
      guests: 2,
      occasion: "",
      notes: "",
    },
  });

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <CheckCircle2 className="size-8" />
        <h2 className="mt-4 font-display text-2xl font-semibold">
          Your request is with us.
        </h2>
        <p className="mt-2 text-sm leading-6 opacity-80">
          We have noted {success.guests} guests for{" "}
          <strong>{success.time}</strong> on{" "}
          <strong>{formatDateLong(`${success.date}T12:00:00+05:45`)}</strong>.
          Our team will contact you to confirm the table. For urgent changes,
          call us.
        </p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => {
            setSuccess(null);
            form.reset();
          }}
        >
          Make another request
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        setServerError("");
        startTransition(async () => {
          const result = await submitReservationAction(values);
          if (!result.success) {
            setServerError(result.message);
            return;
          }
          setSuccess(values);
        });
      })}
      className="space-y-4"
      noValidate
    >
      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Full name"
          htmlFor="reservation-name"
          error={form.formState.errors.name?.message}
          required
        >
          <div className="relative">
            <UserRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="reservation-name"
              autoComplete="name"
              className="pl-10"
              {...form.register("name")}
            />
          </div>
        </FormField>
        <FormField
          label="Phone number"
          htmlFor="reservation-phone"
          error={form.formState.errors.phone?.message}
          required
        >
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="reservation-phone"
              type="tel"
              autoComplete="tel"
              className="pl-10"
              placeholder="98XXXXXXXX"
              {...form.register("phone")}
            />
          </div>
        </FormField>
      </div>
      <FormField
        label="Email address"
        htmlFor="reservation-email"
        error={form.formState.errors.email?.message}
        required
      >
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reservation-email"
            type="email"
            autoComplete="email"
            className="pl-10"
            {...form.register("email")}
          />
        </div>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Date"
          htmlFor="reservation-date"
          error={form.formState.errors.date?.message}
          required
        >
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="reservation-date"
              type="date"
              min={minDate}
              className="pl-10"
              {...form.register("date")}
            />
          </div>
        </FormField>
        <FormField
          label="Time"
          htmlFor="reservation-time"
          error={form.formState.errors.time?.message}
          required
        >
          <div className="relative">
            <Clock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              id="reservation-time"
              className="flex h-11 w-full appearance-none rounded-lg border border-input bg-card pl-10 pr-3 text-sm shadow-xs focus:border-ring focus:ring-[3px] focus:ring-ring/20 focus:outline-none"
              {...form.register("time")}
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Guests"
          htmlFor="reservation-guests"
          error={form.formState.errors.guests?.message}
          hint="For parties over 20, contact us directly."
          required
        >
          <div className="relative">
            <UsersRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="reservation-guests"
              type="number"
              min={1}
              max={20}
              className="pl-10"
              {...form.register("guests", { valueAsNumber: true })}
            />
          </div>
        </FormField>
        <FormField
          label="Occasion (optional)"
          htmlFor="reservation-occasion"
          error={form.formState.errors.occasion?.message}
        >
          <Input
            id="reservation-occasion"
            placeholder="Birthday, anniversary…"
            {...form.register("occasion")}
          />
        </FormField>
      </div>
      <FormField
        label="Notes (optional)"
        htmlFor="reservation-notes"
        error={form.formState.errors.notes?.message}
        hint="Allergies, accessibility needs, garden seating or a favourite corner."
      >
        <Textarea
          id="reservation-notes"
          rows={3}
          placeholder="Anything we should know?"
          {...form.register("notes")}
        />
      </FormField>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CalendarDays className="size-4" />
        )}
        Request my table
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        Requests are confirmed by our team. We will use your contact details
        only for this booking.
      </p>
    </form>
  );
}
