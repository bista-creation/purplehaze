import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MailWarning } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/security";
import { verifyEmailAction } from "@/actions/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const email = params.email?.trim().toLowerCase() ?? "";
  const token = params.token ?? "";

  const record =
    email && token
      ? await prisma.verificationToken.findUnique({
          where: {
            identifier_token: { identifier: email, token: hashToken(token) },
          },
        })
      : null;

  const valid = Boolean(record && record.expires > new Date());

  if (!valid) {
    return (
      <div>
        <div className="grid size-14 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <MailWarning className="size-7" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold">
          This link has expired.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Verification links last for 24 hours. Sign in with your email to
          request a fresh one, or create your account again if needed.
        </p>
        <Alert variant="warning" className="mt-6">
          <AlertTitle>Need a new link?</AlertTitle>
          <AlertDescription>
            Go to sign in, enter your email and choose “Resend verification
            email”.
          </AlertDescription>
        </Alert>
        <Button asChild className="mt-6 w-full" size="lg">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <CheckCircle2 className="size-7" />
      </div>
      <h1 className="mt-6 font-display text-4xl font-semibold">
        One tap to confirm.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Confirm <strong>{email}</strong> and your Purple Haze account is ready.
      </p>
      <form action={verifyEmailAction} className="mt-7">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="token" value={token} />
        <Button type="submit" className="w-full" size="lg">
          Confirm my email
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Didn’t create an account? You can ignore this page.
      </p>
    </div>
  );
}
