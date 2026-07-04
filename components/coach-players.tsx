import Link from "next/link";
import { Panel } from "@/components/ui";

/** Connected players for a coach; each links to that player's videos page. */
export function CoachPlayers({ players }: { players: { id: string; name: string }[] }) {
  return (
    <Panel title="Players">
      {players.length ? (
        <ul className="flex flex-wrap gap-2">
          {players.map((player) => (
            <li key={player.id}>
              <Link
                className="inline-block rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:border-emerald-600"
                href={`/dashboard/coach/players/${player.id}`}
              >
                {player.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-600">No connected players yet.</p>
      )}
    </Panel>
  );
}
