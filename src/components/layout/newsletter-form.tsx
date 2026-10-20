"use client";

import { useActionState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import {
  subscribeNewsletterAction,
  type NewsletterState,
} from "@/actions/newsletter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: NewsletterState = { success: false, message: "" };

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(
    subscribeNewsletterAction,
    initialState,
  );

  if (state.success) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-gold/25 bg-white/5 p-4 text-sm text-white/80">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" />
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex items-center gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <Input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Your email address"
          className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
          required
        />
        <Button
          type="submit"
          variant="gold"
          size="icon"
          disabled={pending}
          aria-label="Subscribe to the newsletter"
        >
          <ArrowRight className="size-4" />
        </Button>
      </div>
      {state.message ? (
        <p className="text-xs text-red-300" role="alert">
          {state.message}
        </p>
      ) : null}
      <p className="text-[11px] leading-relaxed text-white/40">
        Occasional menus, events and offers. Unsubscribe anytime.
      </p>
    </form>
  );
}
