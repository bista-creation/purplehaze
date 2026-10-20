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

const OAUTH_ERRORS: Record<string, string> = {
  AccessDenied:
    "Google sign-in was cancelled, or that account is not allowed. Try again or use your email and password.",
  Configuration:
    "Google sign-in is not configured correctly right now. Please use your email and password, or contact the restaurant.",
  OAuthCallback:
    "Google sign-in could not be completed. Please try again or use your email and password.",
  OAuthCreateAccount:
    "Google sign-in could not be completed. Please try again or use your email and password.",
  OAuthSignin:
    "Google sign-in could not be completed. Please try again or use your email and password.",
  Callback:
    "Google sign-in could not be completed. Please try again or use your email and password.",
  Verification:
    "Google sign-in could not be completed. Please try again or use your email and password.",
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
  const oauthError = params.error ? OAUTH_ERRORS[params.error] : null;

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
      {oauthError ? (
        <Alert variant="warning" className="mb-6">
          <AlertDescription>{oauthError}</AlertDescription>
        </Alert>
      ) : null}
      <LoginForm next={next} googleEnabled={isGoogleAuthEnabled} />
    </div>
  );
}
