// Alphabet without look-alikes (I/L/O/U/0/1) so codes survive being read aloud.
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateGuardianCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

/** Uppercases and strips separators; returns "" if the result is not a valid code. */
export function normalizeGuardianCode(input: string) {
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  return /^[A-Z2-9]{8}$/.test(code) ? code : "";
}

export function formatGuardianCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
