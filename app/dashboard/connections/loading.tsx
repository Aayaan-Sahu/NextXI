import { PageShell, SkeletonBlock } from "@/components/ui";

/** Skeleton for connections: status band + two panel columns. */
export default function ConnectionsLoading() {
  return (
    <PageShell>
      <div aria-label="Loading" className="grid gap-9" role="status">
        <div className="-mx-6 bg-cream-100/80 px-6 py-6 sm:-mx-12 sm:rounded-[12px] sm:px-12">
          <SkeletonBlock className="h-[7.5rem] rounded-[10px]" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonBlock className="h-64 rounded-[10px]" />
          <SkeletonBlock className="h-80 rounded-[10px]" />
        </div>
      </div>
    </PageShell>
  );
}
