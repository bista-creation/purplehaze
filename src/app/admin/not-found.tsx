import Link from "next/link";
import { LayoutDashboard, SearchX } from "lucide-react";
import { AdminCard } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <AdminCard className="p-8 text-center sm:p-12">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <SearchX className="size-6" aria-hidden />
        </span>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
          404 Admin
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          Section not found
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          The requested admin view or record does not exist or may have been deleted.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/admin">
              <LayoutDashboard className="size-4" aria-hidden />
              Dashboard Home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/orders">View Orders</Link>
          </Button>
        </div>
      </AdminCard>
    </div>
  );
}
