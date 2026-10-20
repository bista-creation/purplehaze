"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { clearPageCache } from "@/lib/clear-page-cache";

export function AccountSignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-10 w-full justify-center text-muted-foreground lg:justify-start"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await clearPageCache();
          await signOutAction();
        })
      }
    >
      <LogOut className="size-4" /> {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
