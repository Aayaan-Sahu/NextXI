import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ConnectionsIcon, HomeIcon, MessagesIcon } from "@/components/icons";
import { useUnreadMessageCount } from "@/lib/queries";
import { colors, fonts, typeRoles } from "@/lib/theme";
import { Text } from "@/lib/ui";

/**
 * Three of the eventual five player tabs (Film/Sessions/Progress aren't
 * built yet — see mobile/REMAINING-FEATURES.md). The full five-tab bar's
 * icon budget (docs/mobile-apps.md) doesn't name glyphs for this slice
 * directly, so these three are picked to read the same way the design
 * does: a house for Home, a search glyph for Connections (finding players
 * and coaches), a speech bubble for Messages.
 *
 * A conversation thread is pushed from `app/messages/[connectionId].tsx`,
 * outside this navigator entirely, so it never has a tab bar to hide.
 */
export default function TabsLayout() {
  const unreadCount = useUnreadMessageCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors["rust-600"],
        tabBarInactiveTintColor: colors["ink-600"],
        tabBarStyle: {
          backgroundColor: colors["cream-200"],
          borderTopColor: colors["cream-400"],
        },
        tabBarLabelStyle: {
          fontFamily: fonts.sansSemibold,
          fontSize: typeRoles.micro.fontSize,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <HomeIcon color={String(color)} size={26} strokeWidth={focused ? 2.3 : 1.7} />
          ),
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: "Connections",
          tabBarIcon: ({ color, focused }) => (
            <ConnectionsIcon color={String(color)} size={26} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <MessagesIcon color={String(color)} size={26} strokeWidth={focused ? 2.3 : 1.7} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text variant="micro" tone="cream-50" weight="semibold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: colors["rust-600"],
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 4,
    position: "absolute",
    right: -8,
    top: -4,
  },
});
