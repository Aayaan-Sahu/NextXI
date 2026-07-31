import {
  requestPasswordReset,
  resendVerification,
  signIn,
  signUp,
  updatePassword,
} from "@/app/auth/actions";
import {
  AuthCard,
  AuthShell,
  Field,
  Form,
  Notice,
  PrimaryButton,
  TextInput,
  TextLink,
} from "@/components/ui";

type AuthMode = "sign-in" | "sign-up";

export function AuthPanel({
  error,
  mode,
}: {
  error?: string;
  mode: AuthMode;
}) {
  const isSignUp = mode === "sign-up";

  return (
    <AuthShell>
      <AuthCard
        footer={
          isSignUp ? (
            <>
              Already have an account?{" "}
              <TextLink href="/auth?mode=sign-in">Sign in</TextLink>
            </>
          ) : (
            <>
              New to NextXI?{" "}
              <TextLink href="/auth?mode=sign-up">Create account</TextLink>
            </>
          )
        }
        kicker={isSignUp ? "NEW PLAYER" : "PLAYER GATE"}
        title={isSignUp ? "Create account" : "Sign in"}
      >
        <Form action={isSignUp ? signUp : signIn} className="mt-6">
          <Field>
            Email
            <TextInput autoComplete="email" name="email" required type="email" />
          </Field>
          <Field>
            <span className="flex items-baseline justify-between">
              Password
              {!isSignUp && (
                <TextLink href="/auth/reset-password">Forgot your password?</TextLink>
              )}
            </span>
            <TextInput
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={6}
              name="password"
              required
              type="password"
            />
          </Field>
          {isSignUp && (
            <label className="flex items-start gap-2.5 text-[13px] leading-relaxed select-none">
              <input
                className="mt-0.5 size-4 shrink-0 accent-pitch-900"
                name="consent"
                required
                type="checkbox"
              />
              <span>
                I agree to the{" "}
                <TextLink href="/terms" target="_blank">
                  Terms of Use
                </TextLink>{" "}
                and{" "}
                <TextLink href="/privacy" target="_blank">
                  Privacy Policy
                </TextLink>
                .
              </span>
            </label>
          )}
          <PrimaryButton type="submit" variant="rust">
            {isSignUp ? "Create account" : "Sign in"}
          </PrimaryButton>
        </Form>

        <Notice tone="error">{error}</Notice>
      </AuthCard>
    </AuthShell>
  );
}

export function ResetPasswordPanel({
  error,
  hasUser,
  message,
}: {
  error?: string;
  hasUser: boolean;
  message?: string;
}) {
  return (
    <AuthShell brandKicker="ACCOUNT" brandLine="Reset access. Get back to the crease.">
      <AuthCard
        description={
          hasUser
            ? "Enter a new password for your account."
            : "We will send you a link to reset your password."
        }
        footer={<TextLink href="/auth">Back to sign in</TextLink>}
        kicker="PASSWORD"
        title={hasUser ? "Set a new password" : "Reset password"}
      >
        <Form action={hasUser ? updatePassword : requestPasswordReset} className="mt-6">
          {hasUser ? (
            <Field>
              New password
              <TextInput
                autoComplete="new-password"
                minLength={6}
                name="password"
                required
                type="password"
              />
            </Field>
          ) : (
            <Field>
              Email
              <TextInput autoComplete="email" name="email" required type="email" />
            </Field>
          )}
          <PrimaryButton type="submit" variant="rust">
            {hasUser ? "Update password" : "Send reset email"}
          </PrimaryButton>
        </Form>

        <Notice>{message}</Notice>
        <Notice tone="error">{error}</Notice>
      </AuthCard>
    </AuthShell>
  );
}

export function CheckEmailPanel({
  email,
  error,
  message,
}: {
  email: string;
  error?: string;
  message?: string;
}) {
  return (
    <AuthShell brandKicker="VERIFY" brandLine="Confirm your email. Then earn the scoreboard.">
      <AuthCard
        description="If this is a new account, confirm it from the verification email. If the account already exists, sign in or reset your password."
        footer={<TextLink href="/auth">Back to sign in</TextLink>}
        kicker="INBOX"
        title="Check your email"
      >
        <Form action={resendVerification} className="mt-6">
          <Field>
            Email
            <TextInput
              autoComplete="email"
              defaultValue={email}
              name="email"
              required
              type="email"
            />
          </Field>
          <PrimaryButton type="submit" variant="rust">
            Resend verification email
          </PrimaryButton>
        </Form>

        <Notice>{message}</Notice>
        <Notice tone="error">{error}</Notice>
      </AuthCard>
    </AuthShell>
  );
}
