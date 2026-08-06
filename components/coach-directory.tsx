import { requestConnectionToCoach } from "@/app/dashboard/connections/actions";
import type { CoachDirectoryEntry } from "@/lib/connections";
import { Kicker, Panel, TextInput } from "@/components/ui";

function ConnectAction({ coach }: { coach: CoachDirectoryEntry }) {
  if (coach.state === "accepted") {
    return (
      <span className="font-mono text-[11.5px] font-semibold whitespace-nowrap text-ink-600">
        Connected
      </span>
    );
  }

  if (coach.state === "pending") {
    return (
      <span className="font-mono text-[11.5px] font-semibold whitespace-nowrap text-ink-600">
        Requested
      </span>
    );
  }

  return (
    <form action={requestConnectionToCoach}>
      <input name="coachId" type="hidden" value={coach.id} />
      <button
        className="cursor-pointer rounded-md bg-gold-500 px-3.5 py-2 text-[12.5px] font-bold whitespace-nowrap text-pitch-900 hover:bg-gold-600"
        type="submit"
      >
        {coach.state === "revoked" ? "Request again" : "Request to connect"}
      </button>
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
    <Panel>
      <Kicker>Find a coach</Kicker>
      <form className="mt-4 flex gap-2.5" method="GET">
        <div className="grid min-w-0 flex-1">
          <TextInput
            aria-label="Search coaches by name"
            defaultValue={query}
            name="q"
            placeholder="Search coaches by name"
            type="search"
          />
        </div>
        <button
          className="shrink-0 cursor-pointer rounded-md bg-pitch-900 px-[18px] py-2.5 text-[13px] font-semibold text-cream-200 hover:bg-pitch-800"
          type="submit"
        >
          Search
        </button>
      </form>

      {coaches.length ? (
        <ul className="mt-4">
          {coaches.map((coach) => (
            <li
              className="flex items-center justify-between gap-4 border-t border-cream-400 py-4"
              key={coach.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-pitch-800 text-[15px] font-bold text-cream-200">
                  {coach.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {coach.name}
                    {coach.username ? (
                      <span className="font-mono text-xs font-medium text-ink-600">
                        {" "}
                        @{coach.username}
                      </span>
                    ) : null}
                  </p>
                  {coach.accomplishments.length ? (
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-600">
                      {coach.accomplishments.join(" · ")}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[12.5px] text-ink-600">
                      No accomplishments listed.
                    </p>
                  )}
                </div>
              </div>
              <ConnectAction coach={coach} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-600">
          {query ? "No coaches match your search." : "No approved coaches yet."}
        </p>
      )}
    </Panel>
  );
}
