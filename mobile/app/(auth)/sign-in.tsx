import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";
import { Button, Kicker, Notice, PageTitle, Text, TextField } from "@/lib/ui";

/**
 * Email + password only — no signup, no forgot-password, no onboarding.
 * Every account this screen signs into is assumed to already be an ACTIVE
 * player; the rest of auth is in mobile/REMAINING-FEATURES.md.
 */
export default function SignIn() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    const result = await signIn(email.trim(), password);
    setIsSubmitting(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Kicker>NextXI</Kicker>
            <PageTitle>Sign in</PageTitle>
          </View>

          {error && <Notice tone="error">{error}</Notice>}

          <View style={styles.field}>
            <Text variant="caption" tone="ink-800" weight="semibold">
              Email
            </Text>
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              value={email}
            />
          </View>

          <View style={styles.field}>
            <Text variant="caption" tone="ink-800" weight="semibold">
              Password
            </Text>
            <TextField
              autoCapitalize="none"
              autoComplete="password"
              onChangeText={setPassword}
              secureTextEntry
              value={password}
            />
          </View>

          <Button
            disabled={!email || !password}
            loading={isSubmitting}
            onPress={handleSubmit}
          >
            Sign in
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors["cream-200"], flex: 1 },
  flex: { flex: 1 },
  content: { flex: 1, gap: 16, justifyContent: "center", paddingHorizontal: 24 },
  header: { gap: 6, marginBottom: 12 },
  field: { gap: 6 },
});
