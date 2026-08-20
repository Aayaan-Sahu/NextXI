import { PageShell, SkeletonBlock } from "@/components/ui";

/** Skeleton for the profile editor: title, visibility row, form + sidebar. */
export default function ProfileLoading() {
  return (
    <PageShell>
      <div aria-label="Loading" className="max-w-[1060px]" role="status">
        <SkeletonBlock className="h-[26px] w-[180px] rounded-[5px]" />
        <SkeletonBlock className="mt-2 h-[13px] w-[280px] rounded" />
        <SkeletonBlock className="mt-7 h-20 rounded-lg" />
        <div className="mt-7 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <SkeletonBlock className="h-96 rounded-lg" />
          <SkeletonBlock className="h-64 rounded-lg" />
        </div>
      </div>
    </PageShell>
  );
}
