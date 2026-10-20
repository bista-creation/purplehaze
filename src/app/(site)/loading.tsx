import { Skeleton } from "@/components/ui/skeleton";

export default function SiteLoading() {
  return (
    <div className="container-page py-12 lg:py-20" aria-busy="true">
      <div className="mx-auto max-w-3xl text-center">
        <Skeleton className="mx-auto h-3 w-28" />
        <Skeleton className="mx-auto mt-4 h-10 w-full max-w-xl" />
        <Skeleton className="mx-auto mt-3 h-10 w-4/5 max-w-lg" />
        <Skeleton className="mx-auto mt-6 h-4 w-full max-w-md" />
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <Skeleton className="h-40 w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">
        Loading page
      </span>
    </div>
  );
}
