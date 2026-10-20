"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { registerAction } from "@/actions/auth";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export function RegisterForm({ next }: { next: string }) {
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState<{
    message: string;
    devUrl?: string;
  } | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false as true,
    },
  });
  const acceptTerms = useWatch({
    control: form.control,
    name: "acceptTerms",
  });

  const onSubmit = (values: RegisterInput) => {
    setServerError("");
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) =>
        formData.set(key, String(value)),
      );
      const result = await registerAction(formData);
      if (!result.success) {
        setServerError(result.message);
        return;
      }
      setSuccess({ message: result.message, devUrl: result.devUrl });
    });
  };

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
        <Alert variant="info" className="mt-6">
          <AlertTitle>One important step</AlertTitle>
          <AlertDescription>
            You need to confirm your email before your first sign-in. The link
            lasts for 24 hours.
          </AlertDescription>
        </Alert>
        {success.devUrl ? (
          <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="text-xs font-semibold uppercase tracking-wide">
              Local development shortcut
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              Email delivery is not configured, so use this one-time link.
            </p>
            <a
              href={success.devUrl}
              className="mt-2 inline-flex items-center gap-1.5 font-semibold underline underline-offset-4"
            >
              Verify my email <ExternalLink className="size-3.5" />
            </a>
          </div>
        ) : null}
        <Button asChild className="mt-6 w-full" size="lg">
          <Link href={`/login?next=${encodeURIComponent(next)}`}>
            Continue to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow">Join the table</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">
        Create your account.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Faster checkout, saved addresses and a record of every good meal.
      </p>

      {serverError ? (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-7 space-y-4"
        noValidate
      >
        <FormField
          label="Full name"
          htmlFor="name"
          error={form.formState.errors.name?.message}
          required
        >
          <div className="relative">
            <UserRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              autoComplete="name"
              placeholder="Your name"
              className="pl-10"
              {...form.register("name")}
            />
          </div>
        </FormField>

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

        <FormField
          label="Mobile number"
          htmlFor="phone"
          error={form.formState.errors.phone?.message}
          hint="Used only for order updates and booking confirmations."
          required
        >
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Password"
            htmlFor="password"
            error={form.formState.errors.password?.message}
            required
          >
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="8+ characters"
                className="pl-10 pr-10"
                {...form.register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </FormField>

          <FormField
            label="Confirm password"
            htmlFor="confirmPassword"
            error={form.formState.errors.confirmPassword?.message}
            required
          >
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repeat password"
              {...form.register("confirmPassword")}
            />
          </FormField>
        </div>

        <FormField error={form.formState.errors.acceptTerms?.message}>
          <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-muted-foreground">
            <Checkbox
              className="mt-0.5"
              checked={acceptTerms}
              onCheckedChange={(checked) =>
                form.setValue("acceptTerms", (checked === true) as true, {
                  shouldValidate: true,
                })
              }
            />
            <span>
              I agree to the{" "}
              <Link
                href="/terms"
                className="font-medium text-primary underline"
              >
                terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-medium text-primary underline"
              >
                privacy policy
              </Link>
              .
            </span>
          </label>
        </FormField>

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create my account
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
