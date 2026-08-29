/**
 * The one place the demo cast's identity is defined, so the seeder and the
 * teardown can never disagree about what counts as demo data.
 *
 * example.com is reserved by RFC 2606 and can't receive mail, which is the
 * point: nothing here should ever reach a real inbox.
 */
export const DEMO_EMAIL_PREFIX = "nextxi-demo-";
export const DEMO_EMAIL_DOMAIN = "example.com";

export function demoEmail(key: string) {
  return `${DEMO_EMAIL_PREFIX}${key}@${DEMO_EMAIL_DOMAIN}`;
}

export function isDemoEmail(email: string | null | undefined) {
  return Boolean(
    email &&
      email.toLowerCase().startsWith(DEMO_EMAIL_PREFIX) &&
      email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`),
  );
}
