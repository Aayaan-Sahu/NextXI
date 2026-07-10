import Link from "next/link";
import type { PlayerRole } from "@/app/generated/prisma/enums";
import { Kicker, Panel } from "@/components/ui";
import { PLAYER_ROLE_LABELS } from "@/lib/players";

/** Connected players for a coach; each links to that player's videos page. */
export function CoachPlayers({
  players,
}: {
  players: { id: string; name: string; roles: PlayerRole[] }[];
}) {
  return (
    <Panel>
      <Kicker>Players</Kicker>
      {players.length ? (
        <ul className="mt-3.5 flex flex-wrap gap-2.5">
          {players.map((player) => (
            <li key={player.id}>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-cream-500 px-4 py-2 text-[13px] font-bold text-ink-900 hover:border-pitch-900"
                href={`/dashboard/coach/players/${player.id}`}
              >
                {player.name}
                {player.roles.length > 0 && (
                  <span className="text-[11.5px] font-medium text-ink-600">
                    {player.roles.map((role) => PLAYER_ROLE_LABELS[role]).join(" · ")}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3.5 text-sm text-ink-600">No connected players yet.</p>
      )}
    </Panel>
  );
}
