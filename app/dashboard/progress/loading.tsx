import { PageShell, SkeletonBlock } from "@/components/ui";

/** Skeleton for progress: title, season figures, the chart, then the sidebar. */
export default function ProgressLoading() {
  return (
    <PageShell>
      <div aria-label="Loading" role="status">
        <SkeletonBlock className="h-[26px] w-[180px] rounded-[5px]" />
        <SkeletonBlock className="mt-2 h-[13px] w-[240px] rounded" />
        <div className="mt-7 flex flex-wrap gap-14">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index}>
              <SkeletonBlock className="h-7 w-16 rounded" />
              <SkeletonBlock className="mt-2 h-3 w-24 rounded" />
            </div>
          ))}
        </div>
        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <SkeletonBlock className="h-[220px] rounded-lg" />
          <SkeletonBlock className="h-48 rounded-lg" />
        </div>
      </div>
    </PageShell>
  );
}
