import Link from "next/link";
import type { PlayerDirectoryEntry } from "@/lib/connections";
import {
  COUNTRY_OPTIONS,
  PLAYER_ROLE_LABELS,
  PLAYER_ROLE_OPTIONS,
} from "@/lib/players";
import { Panel } from "@/components/ui";

const selectStyles =
  "rounded-md border border-cream-400 bg-cream-50 px-3 py-2 text-sm text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/25";

/**
 * Searchable player discovery for coaches. A plain GET form: filters live in
 * the URL, so the browser back button restores them and re-runs the search.
 */
export function PlayerDirectory({
  players,
  discipline,
  country,
  searched,
}: {
  players: PlayerDirectoryEntry[];
  discipline: string;
  country: string;
  searched: boolean;
}) {
  return (
    <Panel title="Find a player">
      <form className="flex flex-wrap items-center gap-2.5" method="GET">
        <input name="searched" type="hidden" value="1" />
        <select
          aria-label="Discipline"
          className={selectStyles}
          defaultValue={discipline}
          name="discipline"
        >
          <option value="">All disciplines</option>
          {PLAYER_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Country"
          className={selectStyles}
          defaultValue={country}
          name="country"
        >
          <option value="">Any country</option>
          {COUNTRY_OPTIONS.map((option) => (
            <option key={option.label} value={option.label}>
              {option.flag} {option.label}
            </option>
          ))}
        </select>
        <button
          className="shrink-0 cursor-pointer rounded-md bg-pitch-900 px-[18px] py-2.5 text-[13px] font-semibold text-cream-200 hover:bg-pitch-800"
          type="submit"
        >
          Search
        </button>
      </form>

      {!searched ? (
        <p className="mt-4 text-sm text-ink-600">
          Choose filters and search for players.
        </p>
      ) : players.length ? (
        <ul className="mt-4">
          {players.map((player) => (
            <li
              className="border-t border-cream-400"
              key={player.id}
            >
              <Link
                className="flex items-center justify-between gap-4 py-4 hover:text-rust-700"
                href={`/dashboard/coach/players/${player.id}`}
              >
                <div className="min-w-0">
                  <p className="text-[14.5px] font-bold">{player.name}</p>
                  {player.roles.length ? (
                    <p className="mt-1 text-[12.5px] text-ink-600">
                      {player.roles
                        .map((role) => PLAYER_ROLE_LABELS[role])
                        .join(" · ")}
                    </p>
                  ) : (
                    <p className="mt-1 text-[12.5px] text-ink-600">
                      No disciplines listed.
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[12.5px] font-semibold whitespace-nowrap text-ink-600">
                  {player.country}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-600">
          No players match your filters.
        </p>
      )}
    </Panel>
  );
}
