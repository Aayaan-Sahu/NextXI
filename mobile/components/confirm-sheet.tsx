import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Animated, Easing, Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";
import { Hairline, Text } from "@/lib/ui";

/**
 * The app's one destructive confirmation: a card that rises from the bottom
 * over a dimmed screen, with the irreversible action in rust and Cancel on a
 * separate card below it — the shape iOS users already know from an action
 * sheet, and the one Instagram uses to confirm removing a follower.
 *
 * The slide is hand-driven rather than `Modal`'s `animationType="slide"`,
 * which would carry the scrim up with the card and leave the top of the
 * screen undimmed for the length of the animation.
 */

/** Far enough that the card starts fully below the screen edge. */
const TRAVEL = 460;
const SCRIM_OPACITY = 0.55;

export function ConfirmSheet({
  visible,
  header,
  title,
  message,
  confirmLabel,
  loading = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  /** Optional glyph above the title — an avatar, for "remove this person". */
  header?: ReactNode;
  title: string;
  message?: ReactNode;
  confirmLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) setMounted(true);

    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 170,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });

    // Unmount only once the card is off-screen, so the caller can drop the
    // row it was asking about the moment it closes and still see it slide.
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });

    return () => animation.stop();
  }, [progress, visible]);

  if (!mounted) return null;

  const dismiss = loading ? undefined : onCancel;

  return (
    <Modal animationType="none" onRequestClose={onCancel} statusBarTranslucent transparent visible>
      <Animated.View
        style={[
          styles.scrim,
          { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, SCRIM_OPACITY] }) },
        ]}
      >
        <Pressable accessibilityLabel="Dismiss" onPress={dismiss} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.dock,
          {
            paddingBottom: Math.max(insets.bottom, 12) + 8,
            transform: [
              {
                translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [TRAVEL, 0] }),
              },
            ],
          },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.head}>
            {header}
            <Text variant="lead" tone="ink-900" weight="semibold" style={styles.centred}>
              {title}
            </Text>
            {message && (
              <Text variant="ui" tone="ink-600" style={styles.centred}>
                {message}
              </Text>
            )}
          </View>
          <Hairline />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
            disabled={loading}
            onPress={onConfirm}
            style={styles.action}
          >
            {loading ? (
              <ActivityIndicator color={colors["rust-600"]} />
            ) : (
              <Text variant="body" tone="rust-600" weight="semibold">
                {confirmLabel}
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
          disabled={loading}
          onPress={onCancel}
          style={[styles.card, styles.action]}
        >
          <Text variant="body" tone="ink-900" weight="semibold">
            Cancel
          </Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: colors["pitch-950"],
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  dock: { bottom: 0, gap: 10, left: 0, paddingHorizontal: 12, position: "absolute", right: 0 },
  card: {
    backgroundColor: colors["cream-100"],
    borderRadius: 14,
    overflow: "hidden",
  },
  head: { alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 22 },
  centred: { textAlign: "center" },
  action: { alignItems: "center", justifyContent: "center", minHeight: 56, paddingHorizontal: 20 },
});
