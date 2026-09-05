import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Auth-only Supabase client — this app never talks to PostgREST or Storage
 * directly (every `public` table is RLS deny-all; all reads/writes go
 * through the Next.js API). `persistSession` stays off: supabase-js has no
 * SecureStore-shaped storage adapter, so `lib/session.ts` is the source of
 * truth for what survives an app restart, and rehydrates this client with
 * `supabase.auth.setSession(...)` on launch.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
