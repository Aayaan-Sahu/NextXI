import {
  PublicSans_400Regular,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
  useFonts,
} from "@expo-google-fonts/public-sans";
import { SairaCondensed_700Bold } from "@expo-google-fonts/saira-condensed";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MessagesRealtime } from "@/lib/messages-realtime";
import { SessionProvider, useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * The root of the app: the two faces, the page ground, the query client and
 * session context, and the navigator.
 *
 * The names these fonts register under are the same strings lib/theme.ts
 * hands to `fontFamily` — React Native resolves a font by its registered
 * name, so the two must agree letter for letter.
 */
export default function RootLayout() {
  const [fontsReady, fontError] = useFonts({
    PublicSans_400Regular,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
    SairaCondensed_700Bold,
  });

  // The type system is these two faces at nine sizes. Rendering before they
  // arrive shows a frame of system type at the wrong weight and width, which
  // reads as a broken app rather than a loading one. A font that fails
  // outright still renders — a fallback face beats a blank screen.
  if (!fontsReady && !fontError) {
    return <View style={{ backgroundColor: colors["cream-200"], flex: 1 }} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        {/*
          Renders nothing — it owns the message websocket and the AppState
          lifecycle. A sibling rather than a wrapper so that a change to the
          accepted-connections list re-runs its effects without re-rendering
          the navigator. It no-ops until there is a session.
        */}
        <MessagesRealtime />
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </SafeAreaProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

/**
 * `Stack.Protected` swaps which route group is even mounted based on the
 * `guard`, so a signed-out user can never navigate into (tabs) by a stale
 * link — the group itself doesn't exist in the tree. Keeps the splash
 * screen up until the SecureStore rehydration in SessionProvider resolves,
 * so there's no flash of the sign-in screen before a valid session loads.
 */
function RootNavigator() {
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors["cream-200"] } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        {/*
          Pushed *outside* the tab navigator, not nested in the Messages
          tab's own stack — nesting it meant toggling tabBarStyle on
          navigation, which flashes an empty tab-bar-sized bar mid-transition
          (a known React Navigation issue: a screen that hides the tab bar
          needs to live outside the tab navigator, not inside one tab's
          nested stack).
        */}
        <Stack.Screen
          name="messages/[connectionId]"
          options={{ gestureEnabled: true, fullScreenGestureEnabled: true }}
        />
        <Stack.Screen name="messages/new" options={{ gestureEnabled: true, fullScreenGestureEnabled: true }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="dev/design-system" />
    </Stack>
  );
}
