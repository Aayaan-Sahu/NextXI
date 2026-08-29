/**
 * The one place the demo cast's identity is defined, so the seeder and the
 * teardown can never disagree about what counts as demo data.
 *
 * example.com is reserved by RFC 2606 and can't receive mail, which is the
 * point: nothing here should ever reach a real inbox, and no real account can
 * exist at that domain.
 */
export const DEMO_EMAIL_PREFIX = "nextxi-demo-";
export const DEMO_EMAIL_DOMAIN = "example.com";
/** Films that show a sign-up form need an address that reads like a person's. */
export const DEMO_EMAIL_SUFFIX = ".demo";

export function demoEmail(key: string) {
  return `${DEMO_EMAIL_PREFIX}${key}@${DEMO_EMAIL_DOMAIN}`;
}

/** e.g. "maya.ellison" → maya.ellison.demo@example.com, shown on screen. */
export function demoPersonEmail(handle: string) {
  return `${handle}${DEMO_EMAIL_SUFFIX}@${DEMO_EMAIL_DOMAIN}`;
}

export function isDemoEmail(email: string | null | undefined) {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (!lower.endsWith(`@${DEMO_EMAIL_DOMAIN}`)) return false;
  const local = lower.slice(0, -`@${DEMO_EMAIL_DOMAIN}`.length);
  return local.startsWith(DEMO_EMAIL_PREFIX) || local.endsWith(DEMO_EMAIL_SUFFIX);
}
