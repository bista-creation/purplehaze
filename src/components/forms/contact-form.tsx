"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Mail, Phone, Send, UserRound } from "lucide-react";
import { submitContactAction } from "@/actions/public";
import { contactSchema, type ContactInput } from "@/lib/validations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <CheckCircle2 className="size-8" />
        <h2 className="mt-4 font-display text-2xl font-semibold">
          Message received.
        </h2>
        <p className="mt-2 text-sm leading-6 opacity-80">{success}</p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => {
            setSuccess("");
            form.reset();
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        setServerError("");
        startTransition(async () => {
          const result = await submitContactAction(values);
          if (!result.success) {
            setServerError(result.message);
            return;
          }
          setSuccess(result.message);
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
          label="Your name"
          htmlFor="contact-name"
          error={form.formState.errors.name?.message}
          required
        >
          <div className="relative">
            <UserRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="contact-name"
              autoComplete="name"
              className="pl-10"
              {...form.register("name")}
            />
          </div>
        </FormField>
        <FormField
          label="Email address"
          htmlFor="contact-email"
          error={form.formState.errors.email?.message}
          required
        >
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="contact-email"
              type="email"
              autoComplete="email"
              className="pl-10"
              {...form.register("email")}
            />
          </div>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Phone (optional)"
          htmlFor="contact-phone"
          error={form.formState.errors.phone?.message}
        >
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="contact-phone"
              type="tel"
              autoComplete="tel"
              className="pl-10"
              {...form.register("phone")}
            />
          </div>
        </FormField>
        <FormField
          label="Subject"
          htmlFor="contact-subject"
          error={form.formState.errors.subject?.message}
          required
        >
          <Input
            id="contact-subject"
            placeholder="Reservation, event or feedback"
            {...form.register("subject")}
          />
        </FormField>
      </div>
      <FormField
        label="Your message"
        htmlFor="contact-message"
        error={form.formState.errors.message?.message}
        hint="For urgent booking changes, please call the restaurant."
        required
      >
        <Textarea
          id="contact-message"
          rows={6}
          placeholder="Tell us how we can help…"
          {...form.register("message")}
        />
      </FormField>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Send message
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">
        We use your details only to reply to this enquiry. See our{" "}
        <a href="/privacy" className="font-medium text-primary underline">
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
