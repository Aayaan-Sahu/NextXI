import { requestConnectionToClub } from "@/app/dashboard/connections/actions";
import { PersonAvatar, RespondButtons } from "@/components/connections";
import { SubmitButton } from "@/components/submit-button";
import { SectionHeading } from "@/components/ui";
import type { ClubDirectoryEntry } from "@/lib/clubs.server";
import { countryWithFlag } from "@/lib/players";

function ConnectAction({ club }: { club: ClubDirectoryEntry }) {
  if (club.state === "accepted") {
    return <span className="text-ui whitespace-nowrap text-ink-600">Connected</span>;
  }

  if (club.state === "incoming") {
    return <RespondButtons connectionId={club.connectionId!} />;
  }

  if (club.state === "pending") {
    return <span className="text-ui whitespace-nowrap text-ink-600">Requested</span>;
  }

  return (
    <form action={requestConnectionToClub}>
      <input name="clubId" type="hidden" value={club.id} />
      <SubmitButton className="!px-3.5 !py-[7px] !text-caption" variant="secondary">
        {club.state === "revoked" ? "Request again" : "Request to connect"}
      </SubmitButton>
    </form>
  );
}

/**
 * Verified clubs, listed under the coach directory and filtered by the same
 * search. A club sees a connected player's clips and signed-off reports, and
 * nothing before the player accepts.
 */
export function ClubDirectory({ clubs, query }: { clubs: ClubDirectoryEntry[]; query: string }) {
  return (
    <section>
      <SectionHeading>Club directory</SectionHeading>
      {clubs.length ? (
        <ul className="mt-3.5 border-b border-cream-400">
          {clubs.map((club) => (
            <li
              className="flex items-center gap-3.5 border-t border-cream-400 py-3.5"
              key={club.id}
            >
              <PersonAvatar name={club.name} role="club" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold">
                  {club.name}
                  {club.username ? (
                    <span className="font-normal text-ink-600"> @{club.username}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 line-clamp-1 text-caption text-ink-600">
                  {[countryWithFlag(club.country), club.bio].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="shrink-0">
                <ConnectAction club={club} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3.5 text-ui text-ink-600">
          {query ? "No clubs match your search." : "No verified clubs yet."}
        </p>
      )}
    </section>
  );
}
