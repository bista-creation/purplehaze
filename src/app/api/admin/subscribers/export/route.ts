import { prisma } from "@/lib/prisma";
import { requireExportUser } from "@/lib/api-auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";
import { formatDateTime } from "@/lib/utils";

export async function GET(request: Request) {
  const { user, response } = await requireExportUser(["ADMIN", "STAFF"]);
  if (!user) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = (searchParams.get("q") ?? "").trim().slice(0, 80);

  const where = {
    ...(status === "ACTIVE" ? { isActive: true } : {}),
    ...(status === "INACTIVE" ? { isActive: false } : {}),
    ...(q ? { email: { contains: q } } : {}),
  };

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10_000,
  });

  const headers = [
    { key: "email", label: "Email Address" },
    { key: "status", label: "Subscription Status" },
    { key: "subscribedAt", label: "Subscribed Date (Asia/Kathmandu)" },
  ];

  const rows = subscribers.map((sub) => ({
    email: sub.email,
    status: sub.isActive ? "Active" : "Inactive (Unsubscribed)",
    subscribedAt: formatDateTime(sub.createdAt),
  }));

  const body = toCsv(headers, rows);

  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action: "subscribers.export",
    entity: "NewsletterSubscriber",
    entityId: "all",
    details: {
      count: subscribers.length,
      filterStatus: status || "ALL",
      query: q || null,
    },
  });

  const now = new Date().toISOString().slice(0, 10);
  return csvResponse(`purple-haze-subscribers-${now}.csv`, body);
}
