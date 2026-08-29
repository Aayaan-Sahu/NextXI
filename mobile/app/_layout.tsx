import {
  PublicSans_400Regular,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
  useFonts,
} from "@expo-google-fonts/public-sans";
import { SairaCondensed_700Bold } from "@expo-google-fonts/saira-condensed";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";

/**
 * The root of the app: the two faces, the page ground, and the navigator.
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
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors["cream-200"] },
        }}
      />
    </SafeAreaProvider>
  );
}
