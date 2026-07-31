import { PageShell, SkeletonBlock } from "@/components/ui";

/** Skeleton for the profile editor: header line + two form panels. */
export default function ProfileLoading() {
  return (
    <PageShell>
      <div aria-label="Loading" className="grid gap-9" role="status">
        <SkeletonBlock className="h-12 w-2/5 rounded-md" />
        <SkeletonBlock className="h-96 rounded-[10px]" />
        <SkeletonBlock className="h-40 rounded-[10px]" />
      </div>
    </PageShell>
  );
}
