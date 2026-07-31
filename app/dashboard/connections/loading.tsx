import { PageShell, SkeletonBlock } from "@/components/ui";

/** Skeleton for connections: header line + three request/list rows. */
export default function ConnectionsLoading() {
  return (
    <PageShell>
      <div aria-label="Loading" className="grid gap-9" role="status">
        <SkeletonBlock className="h-12 w-2/5 rounded-md" />
        <div className="grid gap-4">
          <SkeletonBlock className="h-20 rounded-[10px]" />
          <SkeletonBlock className="h-20 rounded-[10px]" />
          <SkeletonBlock className="h-20 rounded-[10px]" />
        </div>
      </div>
    </PageShell>
  );
}
