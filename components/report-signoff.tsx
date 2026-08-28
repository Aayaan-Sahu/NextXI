/**
 * The coach's stamp at the foot of an approved report: the moss tick (the
 * system's one green — a positive verdict in a report), who signed it off and
 * with what standing, when, and their note in their own words. Nothing
 * renders for a released report: nobody reviewed it, so nothing is claimed.
 */
export function ReportSignoff({
  name,
  credential,
  at,
  note,
  self = false,
}: {
  name: string;
  /** The coach's first certification or their club, when they have one. */
  credential?: string | null;
  at: Date;
  note?: string | null;
  /** The viewer is the coach who signed it off. */
  self?: boolean;
}) {
  const date = at.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="mt-6 flex items-start gap-2.5 border-t border-cream-300 pt-4">
      <span aria-hidden className="mt-px text-ui text-moss-600">
        ✓
      </span>
      <div className="min-w-0">
        <p className="text-ui font-semibold text-ink-900">
          {self ? "You signed this off" : `Signed off by ${name}`}
          {credential ? ` · ${credential}` : ""}
        </p>
        <p className="mt-0.5 text-caption text-ink-600">{date}</p>
        {note ? <p className="mt-1.5 text-caption text-ink-600 italic">&ldquo;{note}&rdquo;</p> : null}
      </div>
    </div>
  );
}
