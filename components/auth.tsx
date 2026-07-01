import Link from "next/link";
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
} from "@/components/ui";

type AuthMode = "sign-in" | "sign-up";

const tabBase = "rounded-md px-3 py-2 text-center no-underline";
const tabActive = `${tabBase} bg-neutral-950 text-white dark:bg-neutral-50 dark:text-neutral-950`;
const tabInactive = `${tabBase} text-stone-600 dark:text-neutral-300`;
const textLink =
  "mt-4 inline-block text-sm text-neutral-950 underline-offset-2 hover:underline dark:text-neutral-50";

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
        description="Use your email and password to continue."
        title="Cricket Platform"
      >
        <nav
          className="my-6 grid grid-cols-2 rounded-lg border border-stone-300 p-1 dark:border-neutral-700"
          aria-label="Authentication mode"
        >
          <Link
            aria-current={!isSignUp ? "page" : undefined}
            className={!isSignUp ? tabActive : tabInactive}
            href="/auth?mode=sign-in"
          >
            Sign in
          </Link>
          <Link
            aria-current={isSignUp ? "page" : undefined}
            className={isSignUp ? tabActive : tabInactive}
            href="/auth?mode=sign-up"
          >
            Sign up
          </Link>
        </nav>

        <Form action={isSignUp ? signUp : signIn}>
          <Field>
            Email
            <TextInput autoComplete="email" name="email" required type="email" />
          </Field>
          <Field>
            Password
            <TextInput
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={6}
              name="password"
              required
              type="password"
            />
          </Field>
          <PrimaryButton type="submit">
            {isSignUp ? "Create account" : "Sign in"}
          </PrimaryButton>
        </Form>

        {!isSignUp && (
          <Link className={textLink} href="/auth/reset-password">
            Forgot password?
          </Link>
        )}

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
    <AuthShell>
      <AuthCard
        description={
          hasUser
            ? "Enter a new password for your account."
            : "We will send you a link to reset your password."
        }
        title={hasUser ? "Set a new password" : "Reset password"}
      >
        <Form action={hasUser ? updatePassword : requestPasswordReset}>
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
          <PrimaryButton type="submit">
            {hasUser ? "Update password" : "Send reset email"}
          </PrimaryButton>
        </Form>

        <Link className={textLink} href="/auth">
          Back to sign in
        </Link>

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
    <AuthShell>
      <AuthCard
        description="If this is a new account, confirm it from the verification email. If the account already exists, sign in or reset your password."
        title="Check your email"
      >
        <Form action={resendVerification}>
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
          <PrimaryButton type="submit">Resend verification email</PrimaryButton>
        </Form>

        <Link className={textLink} href="/auth">
          Back to sign in
        </Link>

        <Notice>{message}</Notice>
        <Notice tone="error">{error}</Notice>
      </AuthCard>
    </AuthShell>
  );
}
