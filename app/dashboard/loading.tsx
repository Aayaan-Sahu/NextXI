import { PageShell, SkeletonBlock } from "@/components/ui";

/**
 * Skeleton mirroring the shared anatomy of the dashboard homes — title, a
 * panel, then a card grid — so the wait reads as the page forming rather than
 * a blank spinner. Spinners live only inside pending buttons.
 */
export default function DashboardLoading() {
  return (
    <PageShell>
      <div aria-label="Loading" className="grid gap-6" role="status">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-[26px] w-[180px] rounded-[5px]" />
          <SkeletonBlock className="h-[13px] w-[120px] rounded" />
        </div>
        <SkeletonBlock className="h-24 rounded-lg" />
        <ul className="grid grid-cols-3 gap-5 max-md:grid-cols-2 max-sm:grid-cols-1">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index}>
              <SkeletonBlock className="aspect-video rounded-md" />
              <SkeletonBlock className="mt-2 h-[11px] rounded" />
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
