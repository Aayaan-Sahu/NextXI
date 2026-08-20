import { SubmitButton } from "@/components/submit-button";
import { addStatEntry, deleteStatEntry } from "@/app/dashboard/progress/actions";
import { Field, Form, SectionHead, SectionHeading, TextInput } from "@/components/ui";
import type { StatEntryItem } from "@/lib/progress";

/** "5 Jul" — the log is read as a season, so the year is only noise. */
function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatOvers(overs: number) {
  // Show the raw cricket notation the player entered (e.g. 4 or 4.3).
  return Number.isInteger(overs) ? `${overs}` : overs.toFixed(1);
}

export function StatEntryForm() {
  return (
    <section id="log-a-match">
      <SectionHead
        aside={
          <span className="text-caption text-ink-600">
            Batting or bowling details, or both.
          </span>
        }
      >
        Log a match
      </SectionHead>
      <Form action={addStatEntry} className="mt-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_2fr]">
          <Field>
            Match date
            <TextInput name="matchDate" required type="date" />
          </Field>
          <Field>
            Opponent
            <TextInput
              maxLength={120}
              name="opponent"
              placeholder="Optional"
              type="text"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Field>
            Runs
            <TextInput
              max={1000}
              min={0}
              name="runs"
              placeholder="Optional"
              type="number"
            />
          </Field>
          <Field>
            Balls faced
            <TextInput
              max={2000}
              min={0}
              name="ballsFaced"
              placeholder="Optional"
              type="number"
            />
          </Field>
          <Field>
            Dismissal
            <TextInput
              maxLength={60}
              name="dismissal"
              placeholder="e.g. bowled, not out"
              type="text"
            />
          </Field>
          <Field>
            Overs
            <TextInput
              inputMode="decimal"
              name="oversBowled"
              pattern="\d{1,3}(\.[0-5])?"
              placeholder="e.g. 4.3"
              title="Whole overs, optionally .1–.5 for extra balls (e.g. 4.3)."
              type="text"
            />
          </Field>
          <Field>
            Wickets
            <TextInput
              max={10}
              min={0}
              name="wickets"
              placeholder="Optional"
              type="number"
            />
          </Field>
          <Field>
            Runs conceded
            <TextInput
              max={1000}
              min={0}
              name="runsConceded"
              placeholder="Optional"
              type="number"
            />
          </Field>
        </div>

        <div className="mt-0.5">
          <SubmitButton>Save match</SubmitButton>
        </div>
      </Form>
    </section>
  );
}

/** "18 (24)" — runs off balls, or a dash where nothing was recorded. */
function battingFigure(entry: StatEntryItem) {
  if (entry.runs === null && entry.ballsFaced === null && !entry.dismissal) return "—";
  const runs = entry.runs ?? "–";
  return entry.ballsFaced === null ? `${runs}` : `${runs} (${entry.ballsFaced})`;
}

/** "2–31" — wickets for runs, with the overs bowled beside it. */
function bowlingFigure(entry: StatEntryItem) {
  if (entry.oversBowled === null && entry.wickets === null && entry.runsConceded === null) {
    return "—";
  }
  const figures = `${entry.wickets ?? "–"}–${entry.runsConceded ?? "–"}`;
  return entry.oversBowled === null
    ? figures
    : `${figures} (${formatOvers(entry.oversBowled)} ov)`;
}

const LOG_COLUMNS =
  "grid grid-cols-[72px_1fr_100px_120px_56px] gap-4 max-sm:grid-cols-1 max-sm:gap-1";

export function MatchLog({ entries }: { entries: StatEntryItem[] }) {
  return (
    <section>
      <SectionHeading>Match log</SectionHeading>
      {entries.length ? (
        <div className="mt-3">
          <div className={`${LOG_COLUMNS} pb-2 text-caption text-ink-600 max-sm:hidden`}>
            <span>Date</span>
            <span>Opponent</span>
            <span>Batting</span>
            <span>Bowling</span>
            <span />
          </div>
          <ul className="border-b border-cream-400">
            {entries.map((entry) => (
              <li
                className={`${LOG_COLUMNS} items-baseline border-t border-cream-400 py-3 text-ui`}
                key={entry.id}
              >
                <span className="text-ink-600">{formatDate(entry.matchDate)}</span>
                <span className="truncate">{entry.opponent ?? "—"}</span>
                <span className="tabular-nums">{battingFigure(entry)}</span>
                <span className="tabular-nums">{bowlingFigure(entry)}</span>
                <form action={deleteStatEntry} className="sm:text-right">
                  <input name="id" type="hidden" value={entry.id} />
                  <button
                    className="cursor-pointer text-caption font-semibold text-ink-600 hover:text-rust-600"
                    type="submit"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3.5 text-ui text-ink-600">
          No matches logged yet. Add your first match above to start tracking.
        </p>
      )}
    </section>
  );
}
