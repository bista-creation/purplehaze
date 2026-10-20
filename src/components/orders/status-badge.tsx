import { Badge } from "@/components/ui/badge";
import { STATUS_META, type OrderStatus } from "@/lib/constants";

const toneVariant = {
  amber: "amber",
  violet: "violet",
  blue: "blue",
  gold: "gold",
  green: "green",
  red: "red",
} as const;

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = STATUS_META[status as OrderStatus];
  if (!meta) {
    return (
      <Badge variant="muted" className={className}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge variant={toneVariant[meta.tone]} className={className}>
      {meta.label}
    </Badge>
  );
}
