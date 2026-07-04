import { requestConnectionToCoach } from "@/app/dashboard/connections/actions";
import type { CoachDirectoryEntry } from "@/lib/connections";
import { Panel, PrimaryButton, SecondaryButton, TextInput } from "@/components/ui";

function ConnectAction({ coach }: { coach: CoachDirectoryEntry }) {
  if (coach.state === "accepted") {
    return <span className="text-sm font-medium text-stone-600">Connected</span>;
  }

  if (coach.state === "pending") {
    return <span className="text-sm font-medium text-stone-600">Requested</span>;
  }

  return (
    <form action={requestConnectionToCoach}>
      <input name="coachId" type="hidden" value={coach.id} />
      <PrimaryButton type="submit">
        {coach.state === "revoked" ? "Request again" : "Request to connect"}
      </PrimaryButton>
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
    <Panel title="Find a coach">
      <form className="flex gap-2" method="GET">
        <TextInput
          aria-label="Search coaches by name"
          defaultValue={query}
          name="q"
          placeholder="Search coaches by name"
          type="search"
        />
        <SecondaryButton type="submit">Search</SecondaryButton>
      </form>

      {coaches.length ? (
        <ul className="mt-4 grid gap-3">
          {coaches.map((coach) => (
            <li
              className="flex items-center justify-between gap-3 border-t border-stone-300 pt-3 text-sm first:border-t-0 first:pt-0"
              key={coach.id}
            >
              <div>
                <p className="font-semibold">
                  {coach.name}
                  {coach.username ? (
                    <span className="font-normal text-stone-600"> @{coach.username}</span>
                  ) : null}
                </p>
                {coach.accomplishments.length ? (
                  <p className="mt-1 text-stone-600">{coach.accomplishments.join(" · ")}</p>
                ) : (
                  <p className="mt-1 text-stone-600">No accomplishments listed.</p>
                )}
              </div>
              <ConnectAction coach={coach} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-stone-600">
          {query ? "No coaches match your search." : "No approved coaches yet."}
        </p>
      )}
    </Panel>
  );
}
