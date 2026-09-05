import { requestConnectionToCoach } from "@/app/dashboard/connections/actions";
import { PersonAvatar, RespondButtons } from "@/components/connections";
import { SubmitButton } from "@/components/submit-button";
import type { CoachDirectoryEntry } from "@/lib/connections";
import { SectionHeading, TextInput } from "@/components/ui";

function ConnectAction({ coach }: { coach: CoachDirectoryEntry }) {
  if (coach.state === "accepted") {
    return <span className="text-ui whitespace-nowrap text-ink-600">Connected</span>;
  }

  if (coach.state === "incoming") {
    return <RespondButtons connectionId={coach.connectionId!} />;
  }

  if (coach.state === "pending") {
    return <span className="text-ui whitespace-nowrap text-ink-600">Requested</span>;
  }

  return (
    <form action={requestConnectionToCoach}>
      <input name="coachId" type="hidden" value={coach.id} />
      <SubmitButton className="!px-3.5 !py-[7px] !text-caption" variant="secondary">
        {coach.state === "revoked" ? "Request again" : "Request to connect"}
      </SubmitButton>
    </form>
  );
}

/** Browsable, searchable list of approved coaches for players to discover. */
export function CoachDirectory({
  coaches,
  query,
}: {
  coaches: CoachDirectoryEntry[];
  query: string;
}) {
  return (
    <section>
      <SectionHeading>Coach directory</SectionHeading>
      <form className="mt-3.5 flex gap-2.5" method="GET">
        <input name="tab" type="hidden" value="coaches" />
        <TextInput
          aria-label="Search coaches and clubs by name"
          className="min-w-0 flex-1"
          defaultValue={query}
          name="q"
          placeholder="Search coaches and clubs by name"
          type="search"
        />
        <SubmitButton variant="secondary">Search</SubmitButton>
      </form>

      {coaches.length ? (
        <ul className="mt-4 border-b border-cream-400">
          {coaches.map((coach) => (
            <li
              className="flex items-center gap-3.5 border-t border-cream-400 py-3.5"
              key={coach.id}
            >
              <PersonAvatar name={coach.name} role="coach" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold">
                  {coach.name}
                  {coach.username ? (
                    <span className="font-normal text-ink-600"> @{coach.username}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 line-clamp-1 text-caption text-ink-600">
                  {coach.accomplishments.length
                    ? coach.accomplishments.join(" · ")
                    : "No accomplishments listed."}
                </p>
              </div>
              <div className="shrink-0">
                <ConnectAction coach={coach} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3.5 text-ui text-ink-600">
          {query ? "No coaches match your search." : "No approved coaches yet."}
        </p>
      )}
    </section>
  );
}
