import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { CareerAdmin } from "@/components/admin/career-admin";
import { requireStaff } from "@/lib/security";
import { getReceivedCVs, getVacancies } from "@/lib/careers-store";

export const metadata: Metadata = { title: "Careers & Vacancies" };
export const dynamic = "force-dynamic";

export default async function AdminCareerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireStaff("/admin/career");
  const params = await searchParams;
  const defaultTab = params.tab === "cvs" ? "cvs" : "vacancies";

  const [vacancies, receivedCVs] = await Promise.all([
    getVacancies(),
    getReceivedCVs(),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Talent & Staffing"
        title="Careers & Vacancies"
        description="Announce full-time hospitality vacancies, upload banner pictures, and manage candidate CVs received from Biratnagar applicants."
      />

      <CareerAdmin
        vacancies={vacancies}
        initialCVs={receivedCVs}
        defaultTab={defaultTab}
      />
    </>
  );
}
