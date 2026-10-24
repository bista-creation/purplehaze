import type { Metadata } from "next";
import { ShieldCheck, UserRound, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { StaffAdmin } from "@/components/admin/staff-admin";
import { StatCard } from "@/components/admin/stat-card";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";

export const metadata: Metadata = { title: "Staff & roles" };
export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const user = await requireAdmin("/admin/staff");
  type StaffMember = {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
    isBlocked: boolean;
    emailVerified: Date | null;
    createdAt: Date;
  };
  let staff: StaffMember[] = [];
  let adminCount = 1;
  let staffCount = 0;
  let customerCount = 0;

  try {
    const [st, ac, sc, cc] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isBlocked: true,
        emailVerified: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where: { role: "ADMIN", isBlocked: false } }),
    prisma.user.count({ where: { role: "STAFF", isBlocked: false } }),
    prisma.user.count({ where: { role: "CUSTOMER", isTest: false } }),
    ]);
    staff = st;
    adminCount = ac;
    staffCount = sc;
    customerCount = cc;
  } catch {
    console.warn("Database offline in AdminStaffPage; using current admin user.");
    staff = [
      {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isBlocked: false,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    ];
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Administration"
        title="Staff & roles"
        description="Invite the team, assign least-privilege roles and block access immediately when needed. Sensitive actions always re-check the database role, not just the signed-in session."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Active admins"
          value={String(adminCount)}
          icon={ShieldCheck}
          tone="violet"
          hint="Full access"
        />
        <StatCard
          label="Active staff"
          value={String(staffCount)}
          icon={UserRound}
          tone="gold"
          hint="Service and moderation"
        />
        <StatCard
          label="Customer accounts"
          value={String(customerCount)}
          icon={Users}
          tone="blue"
          hint="Managed under Customers"
        />
      </div>

      <StaffAdmin
        currentUserId={user.id}
        staff={staff.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          role: member.role,
          isBlocked: member.isBlocked,
          emailVerified: member.emailVerified?.toISOString() ?? null,
          createdAt: member.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
