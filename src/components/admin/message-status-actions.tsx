"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { updateContactMessageAction } from "@/actions/admin/content";
import { Button } from "@/components/ui/button";

export function MessageStatusActions({
  id,
  status,
  email,
}: {
  id: string;
  status: string;
  email: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(next: "READ" | "ARCHIVED") {
    startTransition(async () => {
      const result = await updateContactMessageAction(id, next);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button asChild variant="outline" size="sm">
        <a
          href={`mailto:${email}?subject=${encodeURIComponent("Re: your message to Purple Haze")}`}
        >
          <MailCheck className="size-3.5" /> Reply by email
        </a>
      </Button>
      {status === "NEW" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => update("READ")}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <MailCheck className="size-3.5" />}
          Mark read
        </Button>
      ) : null}
      {status !== "ARCHIVED" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => update("ARCHIVED")}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Archive className="size-3.5" />}
          Archive
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => update("READ")}
        >
          Restore
        </Button>
      )}
    </div>
  );
}
