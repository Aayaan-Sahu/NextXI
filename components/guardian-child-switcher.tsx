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
    <nav aria-label="Select child" className="mb-6 flex flex-wrap gap-2">
      {players.map((player) => {
        const selected = player.id === selectedId;

        return (
          <Link
            aria-current={selected ? "page" : undefined}
            className={`rounded-full border px-4 py-[7px] text-[13px] font-semibold no-underline ${
              selected
                ? "border-pitch-900 bg-pitch-900 text-cream-200"
                : "border-cream-500 text-ink-900 hover:bg-cream-100"
            }`}
            href={`${basePath}?child=${player.id}`}
            key={player.id}
          >
            {player.name}
          </Link>
        );
      })}
    </nav>
  );
}
