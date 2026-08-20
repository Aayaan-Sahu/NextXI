import { SkeletonBlock, SubBar } from "@/components/ui";

/** Skeleton for connections: the sub-bar, a roster column, a pending column. */
export default function ConnectionsLoading() {
  return (
    <main id="main-content">
      <SubBar title="Connections">
        <SkeletonBlock className="h-4 w-56 rounded" />
      </SubBar>
      <div
        aria-label="Loading"
        className="mx-auto grid w-full max-w-[1360px] items-start gap-10 px-6 pt-6 pb-14 sm:px-10 lg:grid-cols-[minmax(0,1fr)_320px]"
        role="status"
      >
        <div className="grid gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonBlock className="h-[62px] rounded-lg" key={index} />
          ))}
        </div>
        <SkeletonBlock className="h-56 rounded-lg" />
      </div>
    </main>
  );
}
