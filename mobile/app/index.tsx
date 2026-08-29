import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, typeRoles } from "@/lib/theme";
import { Hairline, Kicker, PageTitle, Panel, Text } from "@/lib/ui";

/**
 * The design-system check.
 *
 * The skeleton's job is to prove the Crease system survives the crossing to
 * React Native: the same colours and the same nine type roles the web draws
 * from, generated from the same shared/theme.css, in the two brand faces.
 * Rendering them is how that gets verified on a device rather than asserted.
 *
 * Scaffolding — replaced by Home as soon as the app has an account to show
 * (docs/mobile-apps.md).
 */

const TYPE_ROLES: { role: keyof typeof typeRoles; weight: Parameters<typeof Text>[0]["weight"]; uppercase?: boolean; sample: string }[] = [
  { role: "display", weight: "display", uppercase: true, sample: "Evening, Aryaman" },
  { role: "title", weight: "bold", sample: "Fix this one thing" },
  { role: "lead", weight: "regular", sample: "Film your next clip side-on." },
  { role: "body", weight: "regular", sample: "Head moved 41 cm at most." },
  { role: "ui", weight: "semibold", sample: "Send for analysis" },
  { role: "caption", weight: "regular", sample: "Cover drive · 12 balls · 60 fps" },
  { role: "micro", weight: "semibold", uppercase: true, sample: "Analysing" },
  { role: "figure", weight: "bold", sample: "82" },
  { role: "figure-sm", weight: "bold", sample: "91" },
];

const PALETTE: { token: Parameters<typeof Text>[0]["tone"] & string; job: string }[] = [
  { token: "rust-600", job: "Brand, links, destructive" },
  { token: "amber-500", job: "Measured data. Never a button" },
  { token: "gold-500", job: "Primary action. The only peach" },
  { token: "pitch-900", job: "Dark panels, report header" },
  { token: "cream-200", job: "Page ground" },
  { token: "cream-50", job: "Raised surface, fields" },
  { token: "cream-400", job: "The one hairline" },
  { token: "moss-600", job: "The one green: a positive verdict" },
  { token: "ink-800", job: "Body copy" },
];

export default function DesignSystemCheck() {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Kicker>Crease</Kicker>
          <PageTitle>Design system</PageTitle>
          <Text variant="ui" tone="ink-600">
            The same tokens as the web, generated from shared/theme.css.
          </Text>
        </View>

        <View style={styles.section}>
          <Kicker>Nine type roles</Kicker>
          <Panel style={styles.panel}>
            {TYPE_ROLES.map(({ role, weight, uppercase, sample }, index) => (
              <View key={role}>
                {index > 0 && <Hairline />}
                <View style={styles.row}>
                  <Text variant="micro" tone="ink-600" uppercase>
                    {role}
                  </Text>
                  <Text variant={role} weight={weight} tone="ink-900" uppercase={uppercase} style={styles.sample}>
                    {sample}
                  </Text>
                </View>
              </View>
            ))}
          </Panel>
        </View>

        <View style={styles.section}>
          <Kicker>The palette</Kicker>
          <Panel style={styles.panel}>
            {PALETTE.map(({ token, job }, index) => (
              <View key={token}>
                {index > 0 && <Hairline />}
                <View style={[styles.row, styles.swatchRow]}>
                  <View style={[styles.swatch, { backgroundColor: colors[token] }]} />
                  <View style={styles.swatchText}>
                    <Text variant="ui" weight="semibold" tone="ink-900">
                      {token}
                    </Text>
                    <Text variant="caption" tone="ink-600">
                      {job}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </Panel>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors["cream-200"], flex: 1 },
  content: { gap: 32, paddingBottom: 48, paddingHorizontal: 24, paddingTop: 16 },
  header: { gap: 8 },
  section: { gap: 12 },
  panel: { paddingHorizontal: 20 },
  row: { paddingVertical: 14 },
  sample: { marginTop: 6 },
  swatchRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  swatch: {
    borderColor: colors["cream-400"],
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    height: 32,
    width: 32,
  },
  swatchText: { flex: 1, gap: 2 },
});
