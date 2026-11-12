"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteSubscriberAction,
  toggleSubscriberStatusAction,
} from "@/actions/admin/subscribers";
import { Button } from "@/components/ui/button";

export function SubscriberActions({
  id,
  email,
  isActive,
}: {
  id: string;
  email: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    toast.success("Email copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = () => {
    startTransition(async () => {
      const res = await toggleSubscriberStatusAction(id, !isActive);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to remove ${email} from the subscribers list?`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteSubscriberAction(id);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
        title="Copy email address"
      >
        {copied ? (
          <Check className="size-3.5 text-emerald-400" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        className={`h-7 px-2 text-xs ${
          isActive
            ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        }`}
        onClick={handleToggle}
        title={isActive ? "Mark subscriber inactive" : "Re-activate subscriber"}
      >
        {pending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Power className="mr-1 size-3" />
        )}
        {isActive ? "Deactivate" : "Activate"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={pending}
        className="size-7 text-muted-foreground hover:text-rose-400"
        onClick={handleDelete}
        title="Remove subscriber"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
