import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AutoPrint } from "@/components/print/auto-print";
import { KitchenTicket } from "@/components/print/kitchen-ticket";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { ThermalPageSize } from "@/components/print/thermal-page-size";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/security";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kitchen order ticket",
  robots: { index: false, follow: false },
};

export default async function PrintKotPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  await requireStaff(`/print/kot/${encodeURIComponent(orderNumber)}`);

  const order = await prisma.order.findUnique({
    where: { orderNumber: decodeURIComponent(orderNumber) },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!order) notFound();

  return (
    <>
      <style id="thermal-page-style">
        {"@page { size: 80mm 297mm; margin: 3mm; }"}
      </style>
      <h1 className="sr-only">Kitchen order ticket {order.orderNumber}</h1>
      <ThermalPageSize targetId="kitchen-ticket" />
      <PrintToolbar
        title={`Kitchen ticket · ${order.orderNumber}`}
        subtitle="80mm thermal · opens the print dialog automatically"
        backHref={`/admin/orders/${order.id}`}
      />
      <KitchenTicket order={order} />
      <AutoPrint />
    </>
  );
}
