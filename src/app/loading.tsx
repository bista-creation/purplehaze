import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <main
      id="main-content"
      className="grid min-h-[60vh] place-items-center px-6 py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20">
          PH
        </span>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading Purple Haze…
        </p>
        <span className="sr-only" role="status">
          Loading page
        </span>
      </div>
    </main>
  );
}
