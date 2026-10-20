"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, Mail } from "lucide-react";
import { forgotPasswordAction } from "@/actions/auth";
import { forgotPasswordSchema } from "@/lib/validations";
import type { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

type ForgotInput = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState<{
    message: string;
    devUrl?: string;
  } | null>(null);

  const form = useForm<ForgotInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  if (success) {
    return (
      <div>
        <div className="grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="size-7" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold">
          Check your inbox.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {success.message}
        </p>
        {success.devUrl ? (
          <Alert variant="warning" className="mt-6">
            <AlertTitle>Local development shortcut</AlertTitle>
            <AlertDescription>
              Email is not configured locally.{" "}
              <a
                href={success.devUrl}
                className="inline-flex items-center gap-1 font-semibold underline"
              >
                Open reset link <ExternalLink className="size-3" />
              </a>
            </AlertDescription>
          </Alert>
        ) : null}
        <Button asChild className="mt-6 w-full" size="lg">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
      <h1 className="mt-7 font-display text-4xl font-semibold">
        Forgot your password?
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Enter the email linked to your account and we will send a reset link.
      </p>

      {serverError ? (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <form
        onSubmit={form.handleSubmit((values) => {
          setServerError("");
          startTransition(async () => {
            const formData = new FormData();
            formData.set("email", values.email);
            const result = await forgotPasswordAction(formData);
            if (!result.success) {
              setServerError(result.message);
              return;
            }
            setSuccess({ message: result.message, devUrl: result.devUrl });
          });
        })}
        className="mt-7 space-y-4"
        noValidate
      >
        <FormField
          label="Email address"
          htmlFor="email"
          error={form.formState.errors.email?.message}
          required
        >
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-10"
              {...form.register("email")}
            />
          </div>
        </FormField>
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Send reset link
        </Button>
      </form>
    </div>
  );
}
