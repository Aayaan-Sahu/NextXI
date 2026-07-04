import { addStatEntry, deleteStatEntry } from "@/app/dashboard/progress/actions";
import { Field, Form, Panel, PrimaryButton, TextInput } from "@/components/ui";
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

function SectionHeading({ children }: { children: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
      {children}
    </h3>
  );
}

export function StatEntryForm() {
  return (
    <Panel title="Log a match">
      <Form action={addStatEntry}>
        <div className="grid gap-4 sm:grid-cols-2">
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

        <section className="grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-4">
          <SectionHeading>Batting</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-3">
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
          </div>
        </section>

        <section className="grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-4">
          <SectionHeading>Bowling</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-3">
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
        </section>

        <p className="text-sm text-stone-600">
          Fill in the batting or bowling details (or both) for the match.
        </p>
        <PrimaryButton type="submit">Save match</PrimaryButton>
      </Form>
    </Panel>
  );
}

function BattingLine({ entry }: { entry: StatEntryItem }) {
  if (entry.runs === null && entry.ballsFaced === null && !entry.dismissal) {
    return null;
  }

  return (
    <p className="text-sm text-neutral-950">
      <span className="text-stone-500">Batting: </span>
      <span className="font-medium">{entry.runs ?? "–"}</span>
      {entry.ballsFaced !== null ? (
        <span className="text-stone-600"> ({entry.ballsFaced} balls)</span>
      ) : null}
      {entry.dismissal ? (
        <span className="text-stone-600"> · {entry.dismissal}</span>
      ) : null}
    </p>
  );
}

function BowlingLine({ entry }: { entry: StatEntryItem }) {
  if (entry.oversBowled === null && entry.wickets === null && entry.runsConceded === null) {
    return null;
  }

  return (
    <p className="text-sm text-neutral-950">
      <span className="text-stone-500">Bowling: </span>
      <span className="font-medium">
        {entry.wickets ?? "–"}/{entry.runsConceded ?? "–"}
      </span>
      {entry.oversBowled !== null ? (
        <span className="text-stone-600"> ({formatOvers(entry.oversBowled)} ov)</span>
      ) : null}
    </p>
  );
}

export function MatchLog({ entries }: { entries: StatEntryItem[] }) {
  return (
    <Panel title="Match log">
      {entries.length ? (
        <ul className="grid gap-3">
          {entries.map((entry) => (
            <li
              className="flex items-start justify-between gap-4 border-t border-stone-200 pt-3 first:border-t-0 first:pt-0"
              key={entry.id}
            >
              <div className="grid gap-1">
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-semibold text-neutral-950">
                    {formatDate(entry.matchDate)}
                  </span>
                  {entry.opponent ? (
                    <span className="text-stone-600">vs {entry.opponent}</span>
                  ) : null}
                </div>
                <BattingLine entry={entry} />
                <BowlingLine entry={entry} />
              </div>
              <form action={deleteStatEntry}>
                <input name="id" type="hidden" value={entry.id} />
                <button
                  className="cursor-pointer text-sm font-medium text-stone-500 hover:text-red-700"
                  type="submit"
                >
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-600">
          No matches logged yet. Add your first match above to start tracking.
        </p>
      )}
    </Panel>
  );
}
