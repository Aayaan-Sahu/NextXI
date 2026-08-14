/** Public contact — mailbox must exist before this address is advertised. */
export const CONTACT_EMAIL = "hello@nextxi.pro";

export const PUBLIC_SITE_URL = "https://www.nextxi.pro";

export function contactMailto(subject?: string, body?: string) {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return `mailto:${CONTACT_EMAIL}${query ? `?${query}` : ""}`;
}

export function safeguardingMailto() {
  return contactMailto(
    "Safeguarding",
    "Please describe the concern. Put “safeguarding” in the subject so it is read first.",
  );
}
