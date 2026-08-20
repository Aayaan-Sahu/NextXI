import Link from "next/link";

/**
 * Pill links that switch which linked child a guardian page shows via the
 * `?child=` URL param. Hidden when the guardian has a single child.
 */
export function GuardianChildSwitcher({
  basePath,
  players,
  selectedId,
}: {
  basePath: string;
  players: { id: string; name: string }[];
  selectedId: string;
}) {
  if (players.length < 2) return null;

  return (
    <nav aria-label="Select child" className="flex flex-wrap gap-2">
      {players.map((player) => {
        const selected = player.id === selectedId;

        return (
          <Link
            aria-current={selected ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-ui no-underline ${
              selected
                ? "bg-pitch-900 font-semibold text-cream-200"
                : "border border-cream-400 bg-cream-50 text-ink-800 hover:border-ink-900"
            }`}
            href={`${basePath}?child=${player.id}`}
            key={player.id}
          >
            {player.name.split(" ")[0] || player.name}
          </Link>
        );
      })}
    </nav>
  );
}
