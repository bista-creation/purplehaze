"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Send,
  UserRound,
  UsersRound,
} from "lucide-react";
import { submitEventBookingAction } from "@/actions/public";
import {
  eventBookingSchema,
  type EventBookingInput,
} from "@/lib/validations";
import { EVENT_TYPES } from "@/lib/constants";
import { formatDateLong } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function EventBookingForm({
  venues,
  minDate,
  initialVenueId = "",
}: {
  venues: Array<{ id: string; name: string }>;
  minDate: string;
  initialVenueId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState<EventBookingInput | null>(null);
  const form = useForm<EventBookingInput>({
    resolver: zodResolver(eventBookingSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      venueId: initialVenueId,
      eventType: "Wedding",
      eventDate: "",
      guests: 50,
      message: "",
    },
  });

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <CheckCircle2 className="size-8" />
        <h2 className="mt-4 font-display text-2xl font-semibold">
          Let&apos;s make a plan.
        </h2>
        <p className="mt-2 text-sm leading-6 opacity-80">
          We have your {success.eventType.toLowerCase()} enquiry for{" "}
          {success.guests} guests on{" "}
          <strong>{formatDateLong(`${success.eventDate}T12:00:00+05:45`)}</strong>.
          Our events team will contact you to discuss the space, menu and
          budget. Capacity and packages are confirmed individually.
        </p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => {
            setSuccess(null);
            form.reset();
          }}
        >
          Send another enquiry
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        setServerError("");
        startTransition(async () => {
          const result = await submitEventBookingAction(values);
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
          htmlFor="event-name"
          error={form.formState.errors.name?.message}
          required
        >
          <div className="relative">
            <UserRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="event-name"
              autoComplete="name"
              className="pl-10"
              {...form.register("name")}
            />
          </div>
        </FormField>
        <FormField
          label="Phone number"
          htmlFor="event-phone"
          error={form.formState.errors.phone?.message}
          required
        >
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="event-phone"
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
        htmlFor="event-email"
        error={form.formState.errors.email?.message}
        required
      >
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="event-email"
            type="email"
            autoComplete="email"
            className="pl-10"
            {...form.register("email")}
          />
        </div>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Event type"
          htmlFor="event-type"
          error={form.formState.errors.eventType?.message}
          required
        >
          <select
            id="event-type"
            className="flex h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm shadow-xs focus:border-ring focus:ring-[3px] focus:ring-ring/20 focus:outline-none"
            {...form.register("eventType")}
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Preferred space"
          htmlFor="event-venue"
          error={form.formState.errors.venueId?.message}
        >
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              id="event-venue"
              className="flex h-11 w-full appearance-none rounded-lg border border-input bg-card pl-10 pr-3 text-sm shadow-xs focus:border-ring focus:ring-[3px] focus:ring-ring/20 focus:outline-none"
              {...form.register("venueId")}
            >
              <option value="">Help me choose</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Event date"
          htmlFor="event-date"
          error={form.formState.errors.eventDate?.message}
          required
        >
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="event-date"
              type="date"
              min={minDate}
              className="pl-10"
              {...form.register("eventDate")}
            />
          </div>
        </FormField>
        <FormField
          label="Estimated guests"
          htmlFor="event-guests"
          error={form.formState.errors.guests?.message}
          hint="An estimate is fine. We will confirm the final count together."
          required
        >
          <div className="relative">
            <UsersRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="event-guests"
              type="number"
              min={1}
              max={500}
              className="pl-10"
              {...form.register("guests", { valueAsNumber: true })}
            />
          </div>
        </FormField>
      </div>
      <FormField
        label="Tell us about the occasion"
        htmlFor="event-message"
        error={form.formState.errors.message?.message}
        hint="Timing, menu preferences, staging or anything else on your mind."
      >
        <Textarea
          id="event-message"
          rows={4}
          placeholder="What would make this event feel right?"
          {...form.register("message")}
        />
      </FormField>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Send event enquiry
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        This is an enquiry, not a confirmed booking. Our team will follow up
        with availability and a tailored quote.
      </p>
    </form>
  );
}
