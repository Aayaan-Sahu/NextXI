import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from "react-native";
import { colors, fonts, typeRoles, type ColorToken, type TypeRole } from "@/lib/theme";

/**
 * The primitives every screen builds from — the app's counterpart to the
 * web's components/ui.tsx, and the reason no screen writes a raw colour or
 * font size.
 *
 * STYLE-GUIDE.md's two rules that break the system most often are inventing
 * a text size and inventing a colour. Here both are impossible: `role` only
 * accepts one of the nine, `tone` only a token from shared/theme.css.
 */

const WEIGHTS = {
  regular: fonts.sans,
  semibold: fonts.sansSemibold,
  bold: fonts.sansBold,
  display: fonts.display,
} as const;

export type Weight = keyof typeof WEIGHTS;

export function Text({
  variant = "body",
  tone = "ink-800",
  weight = "regular",
  uppercase = false,
  style,
  ...props
}: TextProps & {
  /**
   * Which of the nine type roles this is. Named `variant` rather than
   * `role` because React Native already has a `role` prop — the ARIA one —
   * and shadowing it would cost the accessibility affordance. That prop
   * still passes straight through.
   */
  variant?: TypeRole;
  tone?: ColorToken;
  weight?: Weight;
  uppercase?: boolean;
}) {
  return (
    <RNText
      style={[
        typeRoles[variant],
        { color: colors[tone], fontFamily: WEIGHTS[weight] },
        uppercase && styles.uppercase,
        style,
      ]}
      {...props}
    />
  );
}

/** The rust eyebrow that opens a section. Always uppercase, always tracked. */
export function Kicker({ children }: { children: string }) {
  return (
    <Text variant="caption" tone="rust-600" weight="semibold" uppercase style={styles.kicker}>
      {children}
    </Text>
  );
}

/** The page title: Saira Condensed, uppercase. */
export function PageTitle({ children }: { children: string }) {
  return (
    <Text variant="display" tone="ink-900" weight="display" uppercase>
      {children}
    </Text>
  );
}

/**
 * A raised surface — the report is the archetype. Cards are for things that
 * genuinely sit above the page, never for grouping; spacing groups first and
 * the one hairline second.
 */
export function Panel({ style, ...props }: ViewProps) {
  return <View style={[styles.panel, style]} {...props} />;
}

/** The one rule weight in the system. */
export function Hairline({ style, ...props }: ViewProps) {
  return <View style={[styles.hairline, style]} {...props} />;
}

/**
 * Flash notice — a left rule and a tinted ground, mirroring the web's
 * components/ui.tsx Notice. "error" for anything the user must read now;
 * "info" for everything else.
 */
export function Notice({
  children,
  tone = "error",
  style,
}: { children: string; tone?: "info" | "error" } & Pick<ViewProps, "style">) {
  return (
    <View
      style={[
        styles.notice,
        tone === "error" ? styles.noticeError : styles.noticeInfo,
        style,
      ]}
    >
      <Text variant="ui" tone={tone === "error" ? "rust-600" : "ink-800"}>
        {children}
      </Text>
    </View>
  );
}

/** The one text input style in the system — cream ground, ink border, amber focus ring on iOS. */
export function TextField(props: TextInputProps) {
  return (
    <RNTextInput
      placeholderTextColor={colors["ink-400"]}
      style={[styles.textField, props.style]}
      {...props}
    />
  );
}

const BUTTON_TONE = {
  primary: { background: colors["gold-500"], text: "ink-900" as ColorToken },
  secondary: { background: colors["cream-300"], text: "ink-900" as ColorToken },
} as const;

/** Primary (gold-500 fill) or secondary (cream-300 fill) — the two button weights the app needs. */
export function Button({
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  ...props
}: Omit<PressableProps, "children" | "style"> & {
  children: string;
  variant?: keyof typeof BUTTON_TONE;
  loading?: boolean;
  style?: ViewProps["style"];
}) {
  const tone = BUTTON_TONE[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      style={[
        styles.button,
        { backgroundColor: isDisabled ? colors["cream-350"] : tone.background },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={colors["ink-900"]} />
      ) : (
        <Text variant="ui" tone={isDisabled ? "ink-400" : tone.text} weight="semibold">
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  uppercase: { textTransform: "uppercase" },
  kicker: { letterSpacing: 1.6 },
  panel: {
    backgroundColor: colors["cream-50"],
    borderColor: colors["cream-400"],
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  hairline: { backgroundColor: colors["cream-400"], height: StyleSheet.hairlineWidth },
  notice: { borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  noticeError: { backgroundColor: colors["rust-50"], borderLeftColor: colors["rust-600"] },
  noticeInfo: { backgroundColor: colors["cream-250"], borderLeftColor: colors["amber-500"] },
  textField: {
    backgroundColor: colors["cream-50"],
    borderColor: colors["cream-400"],
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors["ink-900"],
    fontFamily: fonts.sans,
    fontSize: typeRoles.body.fontSize,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
