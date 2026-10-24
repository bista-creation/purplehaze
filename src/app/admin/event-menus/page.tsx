import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { EventMenusAdmin } from "@/components/admin/event-menus-admin";
import { requireStaff } from "@/lib/security";
import { getEventMenus } from "@/lib/event-menus-store";

export const metadata: Metadata = { title: "Event Menus" };
export const dynamic = "force-dynamic";

export default async function AdminEventMenusPage() {
  await requireStaff("/admin/event-menus");
  const packages = await getEventMenus(true);

  return (
    <>
      <AdminPageHeader
        eyebrow="Catering & Banquets"
        title="Event Menus"
        description="Design and manage celebration buffet packages, wedding menus, per-plate pricing, min-guests and course items. Changes appear on the public site immediately."
      />
      <EventMenusAdmin packages={packages} />
    </>
  );
}
