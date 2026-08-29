import { StyleSheet, Text as RNText, View, type TextProps, type ViewProps } from "react-native";
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
});
