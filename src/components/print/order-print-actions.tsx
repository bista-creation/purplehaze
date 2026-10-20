import Link from "next/link";
import { ChefHat, Printer, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Links into the dedicated print routes. Opening in a new tab keeps the
 * customer's live order page intact, while `autoprint=1` opens the browser
 * print dialog as soon as the receipt has rendered.
 */
export function OrderPrintActions({
  orderNumber,
  token,
  kot = false,
  className,
}: {
  orderNumber: string;
  token?: string | null;
  kot?: boolean;
  className?: string;
}) {
  const encodedOrder = encodeURIComponent(orderNumber);
  const tokenQuery = token ? `token=${encodeURIComponent(token)}&` : "";
  const a4Href = `/print/receipt/${encodedOrder}?${tokenQuery}variant=a4&autoprint=1`;
  const thermalHref = `/print/receipt/${encodedOrder}?${tokenQuery}variant=thermal&autoprint=1`;
  const kotHref = `/print/kot/${encodedOrder}`;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button asChild variant="outline" size="sm">
        <Link href={a4Href} target="_blank" rel="noopener noreferrer">
          <ReceiptText className="size-4" /> A4 receipt
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={thermalHref} target="_blank" rel="noopener noreferrer">
          <Printer className="size-4" /> 80mm receipt
        </Link>
      </Button>
      {kot ? (
        <Button asChild variant="outline" size="sm">
          <Link href={kotHref} target="_blank" rel="noopener noreferrer">
            <ChefHat className="size-4" /> KOT
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
