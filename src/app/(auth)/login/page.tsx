import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { auth, isGoogleAuthEnabled } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Purple Haze account.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    verified?: string;
    reset?: string;
    error?: string;
  }>;
}) {
  const session = await auth();
  if (session?.user?.id) {
    redirect(
      session.user.role === "ADMIN" || session.user.role === "STAFF"
        ? "/admin"
        : "/account",
    );
  }

  const params = await searchParams;
  const next = safeNextPath(params.next, "/account");

  return (
    <div>
      {params.verified === "1" ? (
        <Alert variant="success" className="mb-6">
          <CheckCircle2 className="text-emerald-600" />
          <AlertDescription>
            Email confirmed. You can sign in now.
          </AlertDescription>
        </Alert>
      ) : null}
      {params.reset === "1" ? (
        <Alert variant="success" className="mb-6">
          <CheckCircle2 className="text-emerald-600" />
          <AlertDescription>
            Password updated. Sign in with your new password.
          </AlertDescription>
        </Alert>
      ) : null}
      {params.error === "OAuthAccountNotLinked" ? (
        <Alert variant="warning" className="mb-6">
          <AlertDescription>
            This email is already registered with a password.{" "}
            <Link href="/login" className="font-semibold underline">
              Sign in with email instead.
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}
      <LoginForm
        next={next}
        googleEnabled={isGoogleAuthEnabled}
      />
    </div>
  );
}
