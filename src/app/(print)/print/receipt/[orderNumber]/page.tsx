import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AutoPrint } from "@/components/print/auto-print";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { ReceiptDocument } from "@/components/print/receipt-document";
import { ThermalPageSize } from "@/components/print/thermal-page-size";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isStaffRole } from "@/lib/security";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order receipt",
  robots: { index: false, follow: false },
};

export default async function PrintReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{
    token?: string;
    variant?: string;
    autoprint?: string;
  }>;
}) {
  const { orderNumber } = await params;
  const { token, variant, autoprint } = await searchParams;
  const [order, user] = await Promise.all([
    prisma.order.findUnique({
      where: { orderNumber: decodeURIComponent(orderNumber) },
      include: { items: { orderBy: { id: "asc" } } },
    }),
    getCurrentUser(),
  ]);

  if (!order) notFound();

  const tokenAuthorized = Boolean(token && token === order.publicToken);
  const ownerAuthorized = Boolean(user && order.userId === user.id);
  const staffAuthorized = Boolean(user && isStaffRole(user.role));
  if (!tokenAuthorized && !ownerAuthorized && !staffAuthorized) notFound();

  const paper = variant === "thermal" ? "thermal" : "a4";
  const encodedOrder = encodeURIComponent(order.orderNumber);
  const queryToken = tokenAuthorized ? order.publicToken : null;
  const tokenQuery = queryToken ? `token=${encodeURIComponent(queryToken)}&` : "";
  const backHref = staffAuthorized
    ? `/admin/orders/${order.id}`
    : queryToken
      ? `/order/${encodedOrder}?token=${encodeURIComponent(queryToken)}`
      : "/account/orders";

  return (
    <>
      <style id={paper === "thermal" ? "thermal-page-style" : undefined}>
        {paper === "thermal"
          ? "@page { size: 80mm 297mm; margin: 3mm; }"
          : "@page { size: A4; margin: 12mm; }"}
      </style>
      <h1 className="sr-only">Order receipt {order.orderNumber}</h1>
      {paper === "thermal" ? (
        <ThermalPageSize targetId="receipt-sheet" />
      ) : null}
      <PrintToolbar
        title={`Receipt · ${order.orderNumber}`}
        subtitle={
          paper === "thermal"
            ? "80mm thermal preview · choose your printer in the print dialog"
            : "A4 preview · choose your printer in the print dialog"
        }
        backHref={backHref}
        paperLinks={[
          {
            href: `/print/receipt/${encodedOrder}?${tokenQuery}variant=a4`,
            label: "A4",
            active: paper === "a4",
          },
          {
            href: `/print/receipt/${encodedOrder}?${tokenQuery}variant=thermal`,
            label: "80mm",
            active: paper === "thermal",
          },
        ]}
      />
      <ReceiptDocument order={order} variant={paper} id="receipt-sheet" />
      {autoprint === "1" ? <AutoPrint /> : null}
    </>
  );
}
