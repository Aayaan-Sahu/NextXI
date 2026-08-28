import { ApiError, jsonError, resolveApiAuth } from "@/lib/api";

export { jsonError };

/**
 * The upload routes' caller check, now the same rule `apiHandler({ auth:
 * "player" })` applies — kept as a helper so those routes' early-return
 * shape didn't have to change in the same commit.
 */
export async function getApiPlayer() {
  try {
    const { player, user } = await resolveApiAuth("player");
    return { player, user };
  } catch (error) {
    if (error instanceof ApiError) return { response: jsonError(error.message, error.status) };
    throw error;
  }
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
