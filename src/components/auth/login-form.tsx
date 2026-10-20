"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { loginAction, resendVerificationAction } from "@/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export function LoginForm({
  next,
  googleEnabled,
  initialMessage,
}: {
  next: string;
  googleEnabled: boolean;
  initialMessage?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState(initialMessage ?? "");
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });
  const remember = useWatch({ control: form.control, name: "remember" });

  const onSubmit = (values: LoginInput) => {
    setServerError("");
    setRequiresVerification(false);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", values.email);
      formData.set("password", values.password);
      formData.set("next", next);
      const result = await loginAction(formData);
      if (!result.success) {
        setServerError(result.message);
        setRequiresVerification(Boolean(result.requiresVerification));
        return;
      }
      toast.success("Welcome back to Purple Haze.");
      router.replace(result.next ?? next);
      router.refresh();
    });
  };

  const resend = () => {
    const email = form.getValues("email");
    startTransition(async () => {
      const result = await resendVerificationAction(email);
      if (result.success) {
        toast.success(result.message);
        if (result.devUrl) {
          window.open(result.devUrl, "_blank", "noopener,noreferrer");
        }
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div>
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.12] sm:text-4xl">
        Your table is waiting.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Sign in to order, track deliveries and keep your favourite dishes close.
      </p>

      {serverError ? (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>
            {serverError}
            {requiresVerification ? (
              <button
                type="button"
                onClick={resend}
                disabled={pending}
                className="mt-2 block font-semibold underline underline-offset-4"
              >
                Resend verification email
              </button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
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
              autoComplete="current-password"
              placeholder="Your password"
              className="pl-10 pr-11"
              {...form.register("password")}
            />
            <button
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
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

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
            <Checkbox
              checked={remember}
              onCheckedChange={(checked) =>
                form.setValue("remember", checked === true)
              }
            />
            Keep me signed in
          </label>
          <Link
            href="/forgot-password"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              or continue with
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleSignInButton next={next} />
        </>
      ) : null}

      <p className="mt-7 text-center text-sm text-muted-foreground">
        New to Purple Haze?{" "}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
