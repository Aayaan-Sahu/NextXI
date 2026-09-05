import { Stack } from "expo-router";

/**
 * Roster → requests-review within the Connections tab. Same config as
 * messages/_layout.tsx: `fullScreenGestureEnabled` widens the swipe-back
 * gesture to the whole screen (iOS), matching the design's "drag the panel
 * right to return" note.
 */
export default function ConnectionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    />
  );
}
