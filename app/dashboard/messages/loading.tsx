import { SkeletonBlock } from "@/components/ui";

/** Skeleton of a message thread: a few alternating bubbles forming. */
export default function ThreadLoading() {
  return (
    <div aria-label="Loading" className="grid gap-3 p-6" role="status">
      <SkeletonBlock className="h-10 w-3/5" />
      <SkeletonBlock className="ml-auto h-10 w-1/2" />
      <SkeletonBlock className="h-10 w-2/5" />
      <SkeletonBlock className="ml-auto h-10 w-2/5" />
    </div>
  );
}
