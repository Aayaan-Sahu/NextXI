/**
 * The three EXPO_PUBLIC_* vars this app needs, read and validated once at
 * import time so a missing one fails loudly on launch instead of as a cryptic
 * fetch/auth error three screens later. Expo inlines EXPO_PUBLIC_* at build
 * time automatically — no app.config.ts required.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name} — copy mobile/.env.example to mobile/.env and fill it in.`);
  }
  return value;
}

export const env = {
  supabaseUrl: required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseKey: required(
    "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  apiUrl: required("EXPO_PUBLIC_API_URL", process.env.EXPO_PUBLIC_API_URL),
};
