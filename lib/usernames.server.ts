import "server-only";
import { prisma } from "@/lib/prisma";
import { USERNAME_PATTERN } from "@/lib/usernames";

export type UsernameStatus = "free" | "taken" | "invalid";

/**
 * Whether a handle can be claimed. The one implementation behind the sign-up
 * form's live check (the `checkUsername` Server Action) and the native apps'
 * `GET /api/usernames/{username}`.
 */
export async function usernameStatus(raw: string): Promise<{ username: string; status: UsernameStatus }> {
  const username = raw.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) return { username, status: "invalid" };

  const existing = await prisma.profile.findUnique({
    where: { username },
    select: { id: true },
  });
  return { username, status: existing ? "taken" : "free" };
}
