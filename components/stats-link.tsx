import { SubmitButton } from "@/components/submit-button";
import { removeStatsLink, saveStatsLink } from "@/app/dashboard/progress/actions";
import { Field, Form, SectionHeading, TextInput } from "@/components/ui";

/**
 * Lets a player attach a link to their public stats (Play-Cricket, ESPNcricinfo,
 * a club profile) so coaches can jump straight to their full record. The URL is
 * validated to plain http(s) server-side (see saveStatsLink) before it is ever
 * stored or rendered as an href.
 */
export function StatsLink({ statsUrl }: { statsUrl: string | null }) {
  return (
    <section>
      <SectionHeading>Public stats link</SectionHeading>
      {statsUrl ? (
        <div className="mt-3.5">
          <a
            className="text-ui leading-relaxed break-all text-ink-800 hover:text-rust-600"
            href={statsUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {statsUrl.replace(/^https?:\/\//, "")} ↗
          </a>
          <form action={removeStatsLink}>
            <button
              className="mt-1.5 cursor-pointer text-caption font-semibold text-rust-600 hover:text-rust-700"
              type="submit"
            >
              Remove link
            </button>
          </form>
        </div>
      ) : (
        <p className="mt-3.5 text-ui leading-relaxed text-ink-800">
          Add a link to your Play-Cricket, ESPNcricinfo or club profile so coaches can see your
          full record.
        </p>
      )}

      <Form action={saveStatsLink} className="mt-3.5">
        <Field>
          <span className="sr-only">{statsUrl ? "Update link" : "Stats link"}</span>
          <TextInput
            defaultValue={statsUrl ?? ""}
            inputMode="url"
            maxLength={500}
            name="statsUrl"
            placeholder="your-club.play-cricket.com/…"
            type="text"
          />
        </Field>
        <SubmitButton className="justify-self-start" variant="secondary">
          {statsUrl ? "Update link" : "Save link"}
        </SubmitButton>
      </Form>
    </section>
  );
}
