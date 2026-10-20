import { Check, Clock, XCircle } from "lucide-react";
import { STATUS_META, type OrderStatus } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";

interface HistoryEntry {
  status: string;
  note: string | null;
  createdAt: Date;
}

const deliveryFlow: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
];

const dineInFlow: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
];

export function OrderTimeline({
  status,
  type,
  history,
}: {
  status: string;
  type: string;
  history: HistoryEntry[];
}) {
  if (status === "CANCELLED") {
    const cancelled = history.find((entry) => entry.status === "CANCELLED");
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">This order was cancelled.</p>
            <p className="mt-1 text-sm leading-6 opacity-80">
              {cancelled?.note ??
                "If you were charged online, our team will process any eligible refund manually."}
            </p>
            {cancelled ? (
              <p className="mt-2 text-xs opacity-60">
                {formatDateTime(cancelled.createdAt)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const flow = type === "DELIVERY" ? deliveryFlow : dineInFlow;
  const currentIndex = Math.max(0, flow.indexOf(status as OrderStatus));

  return (
    <ol className="relative space-y-0">
      {flow.map((step, index) => {
        const meta = STATUS_META[step];
        const entry = history.find((item) => item.status === step);
        const complete = index < currentIndex || status === "COMPLETED";
        const active = index === currentIndex && status !== "COMPLETED";

        return (
          <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
            {index < flow.length - 1 ? (
              <span
                className={cn(
                  "absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-px",
                  complete || active
                    ? "bg-primary/40"
                    : "bg-border",
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                complete
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                    ? "border-primary bg-background text-primary ring-4 ring-primary/10"
                    : "border-border bg-card text-muted-foreground",
              )}
            >
              {complete ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : active ? (
                <Clock className="size-3.5" />
              ) : (
                index + 1
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    !complete && !active && "text-muted-foreground",
                  )}
                >
                  {meta.label}
                </p>
                {entry ? (
                  <span className="text-[11px] text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </span>
                ) : active ? (
                  <span className="text-[11px] font-medium text-primary">
                    In progress
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {entry?.note || meta.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
