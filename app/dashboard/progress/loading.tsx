import { PageShell, SkeletonBlock } from "@/components/ui";

/** Skeleton for progress: header line, chart panel, two list panels. */
export default function ProgressLoading() {
  return (
    <PageShell>
      <div aria-label="Loading" className="grid gap-9" role="status">
        <SkeletonBlock className="h-12 w-2/5 rounded-md" />
        <SkeletonBlock className="h-64 rounded-[10px]" />
        <div className="grid gap-5 sm:grid-cols-2">
          <SkeletonBlock className="h-48 rounded-[10px]" />
          <SkeletonBlock className="h-48 rounded-[10px]" />
        </div>
      </div>
    </PageShell>
  );
}
