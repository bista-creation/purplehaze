"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { setUserBlockedAction } from "@/actions/admin/staff";
import { Button } from "@/components/ui/button";

export function UserBlockButton({
  userId,
  isBlocked,
  noun = "customer",
  compact = false,
}: {
  userId: string;
  isBlocked: boolean;
  noun?: "customer" | "staff member";
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={isBlocked ? "outline" : "ghost"}
      size={compact ? "icon-sm" : "sm"}
      disabled={pending}
      aria-label={isBlocked ? `Unblock ${noun}` : `Block ${noun}`}
      onClick={() => {
        if (
          !window.confirm(
            isBlocked
              ? `Unblock this ${noun}? They will be able to sign in and order again.`
              : `Block this ${noun}? They will be signed out and unable to sign in.`,
          )
        ) {
          return;
        }
        startTransition(async () => {
          const result = await setUserBlockedAction(userId, !isBlocked);
          if (result.success) {
            toast.success(result.message);
            router.refresh();
          } else {
            toast.error(result.message);
          }
        });
      }}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : isBlocked ? (
        <ShieldCheck className="size-3.5" />
      ) : (
        <ShieldOff className="size-3.5" />
      )}
      {compact ? null : isBlocked ? "Unblock" : "Block"}
    </Button>
  );
}

export const CustomerBlockButton = UserBlockButton;
