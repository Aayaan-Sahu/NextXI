import { PageShell, SkeletonBlock } from "@/components/ui";

/**
 * Skeleton mirroring the shared anatomy of the dashboard homes — status
 * band, a panel, then a card grid — so the wait reads as the page forming
 * rather than a blank spinner.
 */
export default function DashboardLoading() {
  return (
    <PageShell>
      <div aria-label="Loading" className="grid gap-9" role="status">
        <SkeletonBlock className="h-32 rounded-[12px]" />
        <SkeletonBlock className="h-44 rounded-[10px]" />
        <ul className="grid grid-cols-3 gap-5 max-md:grid-cols-2 max-sm:grid-cols-1">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index}>
              <SkeletonBlock className="aspect-video rounded-[10px]" />
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
