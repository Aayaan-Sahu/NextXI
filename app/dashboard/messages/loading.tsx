import { SkeletonBlock } from "@/components/ui";

/** Skeleton of the messages two-pane: sidebar header + alternating bubbles. */
export default function ThreadLoading() {
  return (
    <div aria-label="Loading" className="flex flex-1 flex-col" role="status">
      <div className="border-b border-cream-400 bg-white px-4 py-4 md:px-6">
        <SkeletonBlock className="h-14 w-2/5 rounded-md" />
      </div>
      <div className="grid gap-3 p-6">
        <SkeletonBlock className="h-10 w-3/5 rounded-[14px]" />
        <SkeletonBlock className="ml-auto h-10 w-1/2 rounded-[14px]" />
        <SkeletonBlock className="h-10 w-2/5 rounded-[14px]" />
        <SkeletonBlock className="ml-auto h-10 w-2/5 rounded-[14px]" />
      </div>
    </div>
  );
}
