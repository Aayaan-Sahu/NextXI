import "server-only";
import { prisma } from "@/lib/prisma";
import { releaseOrphanedReports } from "@/lib/report-review.server";

/**
 * Connection writes that need the server-only report machinery. The rest of
 * the connection rules live in `lib/connections.ts`, which client components
 * import types from and so must stay free of `server-only`.
 */

export type RemoveOutcome = { message: string } | { error: string };

/**
 * Deletes a connection outright — the app roster's "Remove connection",
 * modelled on Instagram's "Remove follower".
 *
 * This is not `revokeConnection`. Revoking parks the row at REVOKED, which
 * keeps it on the guardian's oversight list and leaves the pair's messages
 * in place; removing leaves the two accounts exactly as they were before
 * either ever asked. There is no row for `directoryState` to read (both
 * sides go back to "Request to connect", not "Request again"), nothing for
 * `createConnectionRequest` to reopen, and — because `messages.connection_id`
 * cascades on delete — no conversation on either side's list.
 *
 * Any participant may remove a row in any state, which grants nobody a new
 * power: a PENDING row is already deletable by its recipient (decline) or by
 * its requester (cancel), and between them that is both participants.
 */
export async function removeConnection(
  userId: string,
  connectionId: string,
): Promise<RemoveOutcome> {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { userAId: true, userBId: true },
  });

  const isParticipant =
    !!connection && (connection.userAId === userId || connection.userBId === userId);

  if (!connection || !isParticipant) {
    return { error: "Connection not found." };
  }

  await prisma.connection.delete({ where: { id: connectionId } });

  // A player whose last reviewing coach just left must not wait on a report
  // forever — the same release `revokeConnection` does. A no-op for whichever
  // side isn't a player, and for players who still have a coach.
  await Promise.all([
    releaseOrphanedReports(connection.userAId),
    releaseOrphanedReports(connection.userBId),
  ]);

  return { message: "Connection removed." };
}
