import { SkeletonBlock } from "@/components/ui";

/** Skeleton of the thread pane: a header, then grouped message rows. */
export default function ThreadLoading() {
  return (
    <div aria-label="Loading" className="flex flex-1 flex-col" role="status">
      <div className="border-b border-cream-400 px-4 py-[18px] md:px-6">
        <SkeletonBlock className="h-4 w-40 rounded" />
        <SkeletonBlock className="mt-2 h-3 w-24 rounded" />
      </div>
      <div className="grid gap-[18px] px-4 py-5 md:px-6">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="flex gap-3" key={index}>
            <SkeletonBlock className="size-[34px] shrink-0 rounded-full" />
            <div className="flex-1">
              <SkeletonBlock className="h-3.5 w-28 rounded" />
              <SkeletonBlock className="mt-2 h-3.5 w-3/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
