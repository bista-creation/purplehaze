import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/security";
import { getUnreadNotificationCount } from "@/lib/notifications";
import type { Role } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | Purple Haze Admin",
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireStaff("/admin");
  const unreadCount = await getUnreadNotificationCount(user.id).catch(() => 0);

  return (
    <AdminShell
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role as Role,
      }}
      unreadCount={unreadCount}
    >
      {children}
    </AdminShell>
  );
}
