import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "nextxi-session";

export type Session = { accessToken: string; refreshToken: string; userId: string };

type StoredSession = { access_token: string; refresh_token: string; user_id: string };

function toSession(stored: StoredSession): Session {
  return { accessToken: stored.access_token, refreshToken: stored.refresh_token, userId: stored.user_id };
}

async function readStoredSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return null;
  try {
    return toSession(JSON.parse(raw) as StoredSession);
  } catch {
    return null;
  }
}

async function writeStoredSession(session: Session | null) {
  if (!session) {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    return;
  }
  const stored: StoredSession = {
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    user_id: session.userId,
  };
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(stored));
}

export type SignInResult = { ok: true } | { ok: false; error: string };

export type SessionState = {
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

/**
 * Rehydrates the session from SecureStore on launch — re-establishing the
 * in-memory supabase-js client via `setSession`, since that client never
 * persists its own session (see lib/supabase.ts) — and keeps SecureStore in
 * sync with whatever supabase-js reports afterward (a background token
 * refresh, or a sign-out from elsewhere).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = await readStoredSession();
      if (stored) {
        const { error } = await supabase.auth.setSession({
          access_token: stored.accessToken,
          refresh_token: stored.refreshToken,
        });
        if (!cancelled && !error) setSession(stored);
        else if (!cancelled) await writeStoredSession(null);
      }
      if (!cancelled) setIsLoading(false);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, authSession) => {
      if (event === "SIGNED_OUT" || !authSession) {
        setSession(null);
        void writeStoredSession(null);
        return;
      }
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        const next: Session = {
          accessToken: authSession.access_token,
          refreshToken: authSession.refresh_token,
          userId: authSession.user.id,
        };
        setSession(next);
        void writeStoredSession(next);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) return { ok: false, error: error?.message ?? "Sign in failed." };

    const next: Session = {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId: data.session.user.id,
    };
    setSession(next);
    await writeStoredSession(next);
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    await writeStoredSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, isLoading, signIn, signOut }),
    [session, isLoading, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within a SessionProvider.");
  return context;
}
