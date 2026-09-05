import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "@/lib/theme";
import { Text } from "@/lib/ui";

const AVATAR_TONE: Record<string, { background: string; text: string }> = {
  player: { background: colors["olive-700"], text: colors["cream-200"] },
};

/** Coaches (and everyone else) sit on ink/gold, players sit on olive. */
export function PersonAvatar({
  name,
  role,
  size = 38,
  style,
}: {
  name: string;
  role?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const tone = (role ? AVATAR_TONE[role] : undefined) ?? {
    background: colors["pitch-900"],
    text: colors["gold-500"],
  };

  return (
    <View
      style={[
        styles.avatar,
        { backgroundColor: tone.background, borderRadius: size / 2, height: size, width: size },
        style,
      ]}
    >
      <Text variant={size >= 48 ? "title" : "ui"} weight="bold" style={{ color: tone.text }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/**
 * A roster / pending / directory row — name, then a single line below it
 * combining @handle and an optional detail ("@minor · Batter"), and a
 * right-side slot for actions.
 */
export function PersonRow({
  name,
  username,
  role,
  detail,
  right,
  avatarSize,
}: {
  name: string;
  username?: string | null;
  role?: string | null;
  detail?: string | null;
  right?: ReactNode;
  avatarSize?: number;
}) {
  const subtitle = [username ? `@${username}` : null, detail].filter(Boolean).join(" · ");

  return (
    <View style={styles.row}>
      <PersonAvatar name={name} role={role} size={avatarSize} />
      <View style={styles.body}>
        <Text variant="body" tone="ink-900" weight="semibold" numberOfLines={1}>
          {name}
        </Text>
        {subtitle && (
          <Text variant="caption" tone="ink-600" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  row: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 10 },
  body: { flex: 1, gap: 2, minWidth: 0 },
});
