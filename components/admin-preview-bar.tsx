import { stopPreviewingCoach } from "@/app/dashboard/admin/actions";
import { SubmitButton } from "@/components/submit-button";

/**
 * Says whose dashboard this is. An administrator reading a coach's queue must
 * never mistake it for their own — the numbers on it are somebody else's work,
 * and the reports in it are waiting on somebody else's signature.
 */
export function AdminPreviewBar({ name }: { name: string }) {
  return (
    <div className="mb-7 flex items-center justify-between gap-5 rounded-lg border border-cream-400 bg-cream-100 px-4 py-3">
      <p className="flex min-w-0 items-center gap-3 text-caption text-ink-800">
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-amber-500" />
        <span>
          You are reading <strong className="font-semibold">{name}</strong>&apos;s dashboard as an
          administrator. Nothing here can be signed off, answered or marked seen from your account.
        </span>
      </p>
      <form action={stopPreviewingCoach}>
        <SubmitButton variant="quiet">Stop</SubmitButton>
      </form>
    </div>
  );
}
