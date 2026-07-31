import { SubmitButton } from "@/components/submit-button";
import { removeStatsLink, saveStatsLink } from "@/app/dashboard/progress/actions";
import { Field, Form, Panel, TextInput } from "@/components/ui";

/**
 * Lets a player attach a link to their public stats (Play-Cricket, ESPNcricinfo,
 * a club profile) so coaches can jump straight to their full record. When a link
 * is set it renders a button that opens it in a new tab; the input below always
 * edits the current value. The URL is validated to plain http(s) server-side
 * (see saveStatsLink) before it is ever stored or rendered as an href.
 */
export function StatsLink({ statsUrl }: { statsUrl: string | null }) {
  return (
    <Panel>
      <div className="flex items-baseline justify-between gap-4 max-md:flex-col">
        <h2 className="font-display text-xl leading-tight font-semibold uppercase">
          Public stats link
        </h2>
        <p className="text-[12.5px] text-ink-600">
          Add a link to your Play-Cricket, ESPNcricinfo, or club profile so coaches
          can see your full record.
        </p>
      </div>

      {statsUrl ? (
        <div className="mt-[18px] flex flex-wrap items-center gap-3">
          <a
            className="inline-flex items-center gap-1.5 rounded-md bg-gold-500 px-4 py-2.5 text-sm font-bold text-pitch-900 hover:bg-gold-600"
            href={statsUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            View my stats ↗
          </a>
          <form action={removeStatsLink} className="ml-auto">
            <button
              className="cursor-pointer text-[12.5px] font-semibold text-rust-600 hover:text-rust-700"
              type="submit"
            >
              Remove
            </button>
          </form>
        </div>
      ) : null}

      <Form action={saveStatsLink} className="mt-[18px]">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field>
            {statsUrl ? "Update link" : "Stats link"}
            <TextInput
              defaultValue={statsUrl ?? ""}
              inputMode="url"
              maxLength={500}
              name="statsUrl"
              placeholder="your-club.play-cricket.com/..."
              type="text"
            />
          </Field>
          <SubmitButton>
            {statsUrl ? "Update link" : "Save link"}
          </SubmitButton>
        </div>
      </Form>
    </Panel>
  );
}
