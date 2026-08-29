import Link from "next/link";
import { Chip, EmptyState } from "@/components/ui";
import type { ClubRosterEntry } from "@/lib/clubs.server";
import { relativeTime } from "@/lib/format-time";
import { PLAYER_ROLE_LABELS } from "@/lib/players";
import type { PlayerRole } from "@/app/generated/prisma/enums";

/**
 * The players who accepted the club. Rows, not the four-up grid: a roster is
 * a list of people, and each row's second line is prose a thumbnail overlay
 * could not carry.
 */
export function ClubRoster({ clubId, players }: { clubId: string; players: ClubRosterEntry[] }) {
  if (!players.length) {
    return (
      <EmptyState>
        No players yet. Players who list this club appear above, and you can invite anyone else by
        username from Connections.
      </EmptyState>
    );
  }

  return (
    <ul className="border-b border-cream-400">
      {players.map((player) => {
        const facts = [
          `aged ${player.age}`,
          `${player.videoCount} ${player.videoCount === 1 ? "clip" : "clips"}`,
          player.latestReportAt
            ? `latest report ${relativeTime(player.latestReportAt)}`
            : "no reports yet",
        ].join(" · ");

        return (
          <li
            className="flex items-center justify-between gap-5 border-t border-cream-400 py-3.5"
            key={player.id}
          >
            <div className="min-w-0">
              <Link
                className="text-ui font-semibold text-ink-900 no-underline hover:text-rust-700"
                href={`/dashboard/club/${clubId}/players/${player.id}`}
              >
                {player.name}
              </Link>
              <p className="mt-0.5 text-caption text-ink-600">{facts}</p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              {player.roles.map((role) => (
                <Chip key={role}>{PLAYER_ROLE_LABELS[role as PlayerRole]}</Chip>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
