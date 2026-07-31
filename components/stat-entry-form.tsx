import { SubmitButton } from "@/components/submit-button";
import { addStatEntry, deleteStatEntry } from "@/app/dashboard/progress/actions";
import { Field, Form, Panel, TextInput } from "@/components/ui";
import type { StatEntryItem } from "@/lib/progress";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatOvers(overs: number) {
  // Show the raw cricket notation the player entered (e.g. 4 or 4.3).
  return Number.isInteger(overs) ? `${overs}` : overs.toFixed(1);
}

export function StatEntryForm() {
  return (
    <Panel>
      <div className="flex items-baseline justify-between gap-4 max-md:flex-col">
        <h2 className="font-display text-xl leading-tight font-semibold uppercase">
          Log a match
        </h2>
        <p className="text-[12.5px] text-ink-600">
          Fill in the batting or bowling details (or both) for the match.
        </p>
      </div>
      <Form action={addStatEntry} className="mt-[18px]">
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
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
    </Panel>
  );
}

function BattingLine({ entry }: { entry: StatEntryItem }) {
  if (entry.runs === null && entry.ballsFaced === null && !entry.dismissal) {
    return null;
  }

  return (
    <p className="mt-[5px] text-[13px] text-ink-600">
      <span>Batting: </span>
      <span>{entry.runs ?? "–"}</span>
      {entry.ballsFaced !== null ? <span> ({entry.ballsFaced} balls)</span> : null}
      {entry.dismissal ? <span> · {entry.dismissal}</span> : null}
    </p>
  );
}

function BowlingLine({ entry }: { entry: StatEntryItem }) {
  if (entry.oversBowled === null && entry.wickets === null && entry.runsConceded === null) {
    return null;
  }

  return (
    <p className="mt-0.5 text-[13px] text-ink-600">
      <span>Bowling: </span>
      <span>
        {entry.wickets ?? "–"}/{entry.runsConceded ?? "–"}
      </span>
      {entry.oversBowled !== null ? (
        <span> ({formatOvers(entry.oversBowled)} ov)</span>
      ) : null}
    </p>
  );
}

export function MatchLog({ entries }: { entries: StatEntryItem[] }) {
  return (
    <Panel title="Match log">
      {entries.length ? (
        <ul>
          {entries.map((entry) => (
            <li
              className="flex items-start justify-between gap-4 border-t border-cream-400 py-4"
              key={entry.id}
            >
              <div>
                <p className="text-sm font-bold">
                  {formatDate(entry.matchDate)}
                  {entry.opponent ? (
                    <span className="font-medium text-ink-600"> vs {entry.opponent}</span>
                  ) : null}
                </p>
                <BattingLine entry={entry} />
                <BowlingLine entry={entry} />
              </div>
              <form action={deleteStatEntry}>
                <input name="id" type="hidden" value={entry.id} />
                <button
                  className="cursor-pointer text-[12.5px] font-semibold text-rust-600 hover:text-rust-700"
                  type="submit"
                >
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-600">
          No matches logged yet. Add your first match above to start tracking.
        </p>
      )}
    </Panel>
  );
}
