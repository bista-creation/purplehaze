"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.97 10.97 0 0 0 12 1 11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  next,
  label = "Continue with Google",
  className,
}: {
  next: string;
  label?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={pending}
      aria-label={label}
      className={cn(
        "h-12 w-full gap-3 rounded-xl border-[#dadce0] bg-white px-4 text-sm font-medium text-[#3c4043] shadow-sm hover:border-[#c4c7c5] hover:bg-[#f8f9fa] dark:border-white/20 dark:bg-white dark:text-[#1f1f1f] dark:hover:bg-[#f8f9fa]",
        className,
      )}
      onClick={async () => {
        setPending(true);
        try {
          await signIn("google", { redirectTo: next });
        } catch {
          setPending(false);
          toast.error("Google sign-in is unavailable right now.");
        }
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
      <span>{pending ? "Opening Google…" : label}</span>
    </Button>
  );
}
