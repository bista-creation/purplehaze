import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  TestTube2,
  UserRound,
} from "lucide-react";
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { CustomerBlockButton } from "@/components/admin/customer-block-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { formatNPR } from "@/lib/money";
import {
  realOrdersWhere,
  testDataControlsVisible,
} from "@/lib/test-data";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    blocked?: string;
    page?: string;
    test?: string;
  }>;
}) {
  await requireAdmin("/admin/customers");
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 80);
  const blocked = params.blocked === "1";
  const testControlsVisible = testDataControlsVisible();
  const includeTest = testControlsVisible && params.test === "1";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(includeTest ? {} : { isTest: false }),
    ...(blocked ? { isBlocked: true } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  type CustomerItem = {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    image: string | null;
    isBlocked: boolean;
    isTest: boolean;
    createdAt: Date;
    emailVerified: Date | null;
    _count: { orders: number };
  };
  let customers: CustomerItem[] = [];
  let total = 0;
  let customerCount = 0;
  let blockedCount = 0;
  let spendMap = new Map<string | null, number>();

  try {
    const [cList, tot, cCount, bCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        isBlocked: true,
        isTest: true,
        createdAt: true,
        emailVerified: true,
        _count: { select: { orders: { where: realOrdersWhere() } } },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({
      where: { role: "CUSTOMER", ...(includeTest ? {} : { isTest: false }) },
    }),
    prisma.user.count({
      where: {
        role: "CUSTOMER",
        isBlocked: true,
        ...(includeTest ? {} : { isTest: false }),
      },
    }),
  ]);

    customers = cList;
    total = tot;
    customerCount = cCount;
    blockedCount = bCount;

    const ids = customers.map((customer) => customer.id);
    if (ids.length > 0) {
      const spend = await prisma.order.groupBy({
        by: ["userId"],
        where: realOrdersWhere({
          userId: { in: ids },
          paymentStatus: "PAID",
          status: { not: "CANCELLED" },
        }),
        _sum: { total: true },
      });
      spendMap = new Map(
        spend.map((row) => [row.userId, row._sum.total ?? 0]),
      );
    }
  } catch {
    console.warn("Database offline in AdminCustomersPage; using empty list.");
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(next: {
    q?: string;
    blocked?: string;
    page?: number;
    test?: boolean;
  }) {
    const query = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextBlocked = next.blocked ?? (blocked ? "1" : "");
    const nextTest = next.test ?? includeTest;
    if (nextQ) query.set("q", nextQ);
    if (nextBlocked === "1") query.set("blocked", "1");
    if (nextTest) query.set("test", "1");
    if ((next.page ?? 1) > 1) query.set("page", String(next.page));
    return query.toString() ? `/admin/customers?${query}` : "/admin/customers";
  }

  const exportQuery = new URLSearchParams();
  if (q) exportQuery.set("q", q);
  if (blocked) exportQuery.set("blocked", "1");

  return (
    <>
      <AdminPageHeader
        eyebrow="Audience"
        title="Customers"
        description={`${customerCount} customer accounts · ${blockedCount} blocked. Customer accounts are created on your public site; staff accounts live under Staff & roles.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/api/admin/reports/customers${exportQuery.toString() ? `?${exportQuery}` : ""}`}
            >
              <Download className="size-3.5" /> Export CSV
            </Link>
          </Button>
        }
      />

      <AdminCard className="mb-4 p-4">
        <form
          action="/admin/customers"
          method="GET"
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          {includeTest ? <input type="hidden" name="test" value="1" /> : null}
          <div className="min-w-0 flex-1">
            <label
              htmlFor="customer-search"
              className="mb-1.5 block text-xs font-semibold"
            >
              Search customers
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="customer-search"
                name="q"
                defaultValue={q}
                placeholder="Name, email or phone"
                className="pl-9"
              />
            </div>
          </div>
          <label className="flex h-10 items-center gap-2 text-xs">
            <input
              type="checkbox"
              name="blocked"
              value="1"
              defaultChecked={blocked}
              className="size-4 accent-primary"
            />
            Blocked only
          </label>
          <Button type="submit" variant="outline">
            Apply filters
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Test accounts are excluded from customer metrics and the CSV export.
          </p>
          {testControlsVisible ? (
            <Link
              href={href({ test: !includeTest, page: 1 })}
              className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <TestTube2 className="size-3.5" />
              {includeTest ? "Hide test accounts" : "Show test accounts"}
            </Link>
          ) : null}
        </div>
      </AdminCard>

      {customers.length === 0 ? (
        <AdminEmpty
          title="No customer accounts found"
          description="Customers appear here after they register on the website. Guest orders are still visible under Orders."
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Paid spend</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                          <UserRound className="size-4" />
                        </span>
                        <div>
                          <p className="font-medium">
                            {customer.name ?? "Unnamed customer"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {customer.email}
                          </p>
                          {customer.isTest ? (
                            <Badge variant="amber" className="mt-1 text-[9px]">
                              Test
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {customer.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {formatDate(customer.createdAt)}
                      <br />
                      {formatDateTime(customer.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={
                          customer.phone
                            ? `/admin/orders?q=${encodeURIComponent(customer.phone)}`
                            : "/admin/orders"
                        }
                        className="font-semibold text-primary hover:underline"
                      >
                        {customer._count.orders}
                      </Link>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatNPR(spendMap.get(customer.id) ?? 0)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={customer.isBlocked ? "red" : "green"}>
                          {customer.isBlocked ? "Blocked" : "Active"}
                        </Badge>
                        {!customer.emailVerified ? (
                          <span className="text-[10px] text-muted-foreground">
                            Unverified
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <CustomerBlockButton
                        userId={customer.id}
                        isBlocked={customer.isBlocked}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </AdminCard>
      )}

      {totalPages > 1 ? (
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total} accounts
          </p>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="icon"
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              <Link href={href({ page: page - 1 })} aria-label="Previous page">
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="icon"
              className={
                page >= totalPages ? "pointer-events-none opacity-50" : ""
              }
            >
              <Link href={href({ page: page + 1 })} aria-label="Next page">
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
