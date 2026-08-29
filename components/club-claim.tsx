import { claimPlayers } from "@/app/dashboard/club/[clubId]/actions";
import { SubmitButton } from "@/components/submit-button";
import { Chip } from "@/components/ui";
import type { ClaimablePlayer } from "@/lib/clubs.server";
import { PLAYER_ROLE_LABELS } from "@/lib/players";
import type { PlayerRole } from "@/app/generated/prisma/enums";

/**
 * Players who typed this club's name at sign-up. Ticking one and submitting
 * sends a connection request — the same request a coach sends, answered the
 * same way. A club never gains access to a player's footage without the
 * player accepting, whatever they wrote in a text field.
 */
export function ClubClaim({ clubId, players }: { clubId: string; players: ClaimablePlayer[] }) {
  return (
    <form action={claimPlayers}>
      <input name="clubId" type="hidden" value={clubId} />
      <ul className="border-b border-cream-400">
        {players.map((player) => (
          <li className="border-t border-cream-400" key={player.id}>
            <label className="flex cursor-pointer items-center justify-between gap-5 py-3.5 select-none">
              <span className="flex min-w-0 items-center gap-3.5">
                <input
                  className="size-4 shrink-0 accent-pitch-900"
                  defaultChecked
                  name="playerId"
                  type="checkbox"
                  value={player.id}
                />
                <span className="min-w-0">
                  <span className="block text-ui font-semibold text-ink-900">{player.name}</span>
                  <span className="mt-0.5 block text-caption text-ink-600">
                    aged {player.age}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 flex-wrap justify-end gap-2">
                {player.roles.map((role) => (
                  <Chip key={role}>{PLAYER_ROLE_LABELS[role as PlayerRole]}</Chip>
                ))}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <SubmitButton>
          Ask {players.length === 1 ? "this player" : `these ${players.length} players`} to connect
        </SubmitButton>
      </div>
    </form>
  );
}
