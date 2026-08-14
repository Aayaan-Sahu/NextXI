export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

/** Public handle derived from a display name. Empty if it wouldn't be valid. */
export function usernameFromName(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);

  return USERNAME_PATTERN.test(slug) ? slug : "";
}
