import { requestConnectionToPlayer } from "@/app/dashboard/connections/actions";
import { PersonAvatar } from "@/components/connections";
import { SubmitButton } from "@/components/submit-button";
import type { PlayerSearchEntry } from "@/lib/connections";
import { countryWithFlag, PLAYER_ROLE_LABELS } from "@/lib/players";
import { SectionHeading, TextInput } from "@/components/ui";

function ConnectAction({ player }: { player: PlayerSearchEntry }) {
  if (player.state === "accepted") {
    return <span className="text-ui whitespace-nowrap text-ink-600">Connected</span>;
  }

  if (player.state === "pending") {
    return <span className="text-ui whitespace-nowrap text-ink-600">Requested</span>;
  }

  return (
    <form action={requestConnectionToPlayer}>
      <input name="playerId" type="hidden" value={player.id} />
      <SubmitButton className="!px-3.5 !py-[7px] !text-caption" variant="secondary">
        {player.state === "revoked" ? "Request again" : "Request to connect"}
      </SubmitButton>
    </form>
  );
}

/**
 * Search-only player discovery: there is no browsable roster of every player
 * on the platform, only a match on a name or @username you already have in
 * mind — connect the way you'd add a friend, not browse a directory.
 */
export function PlayerSearch({
  players,
  query,
}: {
  players: PlayerSearchEntry[];
  query: string;
}) {
  return (
    <section>
      <SectionHeading>Players</SectionHeading>
      <form className="mt-3.5 flex gap-2.5" method="GET">
        <TextInput
          aria-label="Search players by name or username"
          className="min-w-0 flex-1"
          defaultValue={query}
          name="pq"
          placeholder="Name or @username"
          type="search"
        />
        <SubmitButton variant="secondary">Search</SubmitButton>
      </form>

      {!query ? (
        <p className="mt-3.5 text-ui text-ink-600">
          Search for a player by name or username to connect.
        </p>
      ) : players.length ? (
        <ul className="mt-4 border-b border-cream-400">
          {players.map((player) => (
            <li
              className="flex items-center gap-3.5 border-t border-cream-400 py-3.5"
              key={player.id}
            >
              <PersonAvatar name={player.name} role="player" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold">
                  {player.name}
                  {player.username ? (
                    <span className="font-normal text-ink-600"> @{player.username}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 line-clamp-1 text-caption text-ink-600">
                  {player.roles.length
                    ? `${player.roles.map((role) => PLAYER_ROLE_LABELS[role]).join(" · ")} · ${countryWithFlag(player.country)}`
                    : countryWithFlag(player.country)}
                </p>
              </div>
              <div className="shrink-0">
                <ConnectAction player={player} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3.5 text-ui text-ink-600">No players match your search.</p>
      )}
    </section>
  );
}
