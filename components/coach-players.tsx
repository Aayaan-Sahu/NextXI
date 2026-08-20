import Link from "next/link";
import type { PlayerRole } from "@/app/generated/prisma/enums";
import { SectionHeading } from "@/components/ui";
import { PLAYER_ROLE_LABELS } from "@/lib/players";

const VISIBLE = 8;

/** Connected players for a coach; each links to that player's videos page. */
export function CoachPlayers({
  players,
}: {
  players: { id: string; name: string; roles: PlayerRole[] }[];
}) {
  const shown = players.slice(0, VISIBLE);
  const overflow = players.length - shown.length;

  return (
    <section>
      <SectionHeading>Your players</SectionHeading>
      {players.length ? (
        <ul className="mt-3.5 flex flex-wrap items-center gap-2">
          {shown.map((player) => (
            <li key={player.id}>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-cream-400 bg-cream-50 px-3.5 py-2 text-ui text-ink-900 no-underline hover:border-ink-900"
                href={`/dashboard/coach/players/${player.id}`}
              >
                <span className="grid size-[22px] place-items-center rounded-full bg-olive-700 text-micro font-bold text-cream-200">
                  {player.name.charAt(0).toUpperCase()}
                </span>
                {player.name}
                {player.roles.length > 0 && (
                  <span className="text-ink-600">
                    {player.roles.map((role) => PLAYER_ROLE_LABELS[role]).join(" · ")}
                  </span>
                )}
              </Link>
            </li>
          ))}
          {overflow > 0 ? (
            <li>
              <Link
                className="px-1.5 py-2 text-ui font-semibold text-rust-600 no-underline"
                href="/dashboard/connections?tab=players"
              >
                {overflow} more
              </Link>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-3.5 text-ui text-ink-600">No connected players yet.</p>
      )}
    </section>
  );
}
