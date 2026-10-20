"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { resetPasswordAction } from "@/actions/auth";
import { resetPasswordSchema } from "@/lib/validations";
import type { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

type ResetInput = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<ResetInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <div>
        <h1 className="font-display text-4xl font-semibold">
          This link isn’t complete.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Request a fresh password reset link to continue.
        </p>
        <Button asChild className="mt-6 w-full" size="lg">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow">Almost there</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">
        Choose a new password.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Make it something strong, memorable and yours alone.
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
            formData.set("token", values.token);
            formData.set("password", values.password);
            formData.set("confirmPassword", values.confirmPassword);
            const result = await resetPasswordAction(formData);
            if (!result.success) {
              setServerError(result.message);
              return;
            }
            router.replace(result.next ?? "/login?reset=1");
          });
        })}
        className="mt-7 space-y-4"
        noValidate
      >
        <FormField
          label="New password"
          htmlFor="password"
          error={form.formState.errors.password?.message}
          hint="At least 8 characters with a letter and a number."
          required
        >
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="New password"
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
          label="Confirm new password"
          htmlFor="confirmPassword"
          error={form.formState.errors.confirmPassword?.message}
          required
        >
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repeat new password"
            {...form.register("confirmPassword")}
          />
        </FormField>

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Update password
        </Button>
      </form>
    </div>
  );
}
