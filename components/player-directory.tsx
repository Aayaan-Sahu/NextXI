import Link from "next/link";
import { PersonAvatar } from "@/components/connections";
import { SubmitButton } from "@/components/submit-button";
import type { PlayerDirectoryEntry } from "@/lib/connections";
import {
  countryWithFlag,
  COUNTRY_OPTIONS,
  PLAYER_ROLE_LABELS,
  PLAYER_ROLE_OPTIONS,
} from "@/lib/players";
import { Field, SectionHeading, Select } from "@/components/ui";

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
    <section>
      <SectionHeading>Player directory</SectionHeading>
      <form className="mt-3.5 flex flex-wrap items-end gap-3" method="GET">
        <input name="searched" type="hidden" value="1" />
        <Field className="text-caption">
          Discipline
          <Select className="sm:w-[190px]" defaultValue={discipline} name="discipline">
            <option value="">All disciplines</option>
            {PLAYER_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field className="text-caption">
          Country
          <Select className="sm:w-[190px]" defaultValue={country} name="country">
            <option value="">Any country</option>
            {COUNTRY_OPTIONS.map((option) => (
              <option key={option.label} value={option.label}>
                {option.flag} {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <SubmitButton variant="secondary">Search</SubmitButton>
      </form>

      {!searched ? (
        <p className="mt-3.5 text-ui text-ink-600">Choose filters and search for players.</p>
      ) : players.length ? (
        <>
          <ul className="mt-4 border-b border-cream-400">
            {players.map((player) => (
              <li className="border-t border-cream-400" key={player.id}>
                <Link
                  className="flex items-center gap-3.5 py-3.5 no-underline"
                  href={`/dashboard/coach/players/${player.id}`}
                >
                  <PersonAvatar name={player.name} role="player" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold">{player.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-caption text-ink-600">
                      {player.roles.length
                        ? `${player.roles.map((role) => PLAYER_ROLE_LABELS[role]).join(" · ")} · ${countryWithFlag(player.country)}`
                        : countryWithFlag(player.country)}
                    </p>
                  </div>
                  <span className="shrink-0 text-ui font-semibold text-rust-600">
                    View player →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-caption text-ink-600">
            Only public, active players appear here. Connect from a player&apos;s page.
          </p>
        </>
      ) : (
        <p className="mt-3.5 text-ui text-ink-600">No players match your filters.</p>
      )}
    </section>
  );
}
