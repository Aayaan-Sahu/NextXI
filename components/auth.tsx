"use client";

import { useState } from "react";
import {
  requestPasswordReset,
  resendVerification,
  signIn,
  signUp,
  updatePassword,
} from "@/app/auth/actions";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import {
  AuthCard,
  AuthShell,
  Field,
  Form,
  Notice,
  TextInput,
  TextLink,
} from "@/components/ui";

type AuthMode = "sign-in" | "sign-up";

const modeLinkStyles =
  "cursor-pointer font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline";

export function AuthPanel({
  error,
  mode: initialMode,
}: {
  error?: string;
  mode: AuthMode;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const isSignUp = mode === "sign-up";

  // Shallow URL sync: the switch is instant and client-side, but the URL
  // stays shareable and the back button still lands on the right mode.
  function switchMode(next: AuthMode) {
    setMode(next);
    window.history.replaceState(null, "", `/auth?mode=${next}`);
  }

  return (
    <AuthShell>
      {/* Keyed on mode so a switch crossfades the card in. */}
      <div className="animate-crease-fade" key={mode}>
      <AuthCard
        footer={
          isSignUp ? (
            <>
              <p className="mb-1.5">
                Under-18s need a parent or guardian to approve their account
                after sign-up.
              </p>
              Already have an account?{" "}
              <button className={modeLinkStyles} onClick={() => switchMode("sign-in")} type="button">
                Sign in
              </button>
            </>
          ) : (
            <>
              New to NextXI?{" "}
              <button className={modeLinkStyles} onClick={() => switchMode("sign-up")} type="button">
                Create account
              </button>
            </>
          )
        }
        kicker={isSignUp ? "JOIN" : "GATE"}
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
            <PasswordInput
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={6}
              name="password"
              required
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
          <SubmitButton variant="rust">
            {isSignUp ? "Create account" : "Sign in"}
          </SubmitButton>
        </Form>

        {/* A server-reported error belongs to the mode it happened in. */}
        <Notice tone="error">{mode === initialMode ? error : null}</Notice>
      </AuthCard>
      </div>
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
              <PasswordInput
                autoComplete="new-password"
                minLength={6}
                name="password"
                required
              />
            </Field>
          ) : (
            <Field>
              Email
              <TextInput autoComplete="email" name="email" required type="email" />
            </Field>
          )}
          <SubmitButton variant="rust">
            {hasUser ? "Update password" : "Send reset email"}
          </SubmitButton>
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
          <SubmitButton variant="rust">
            Resend verification email
          </SubmitButton>
        </Form>

        <Notice>{message}</Notice>
        <Notice tone="error">{error}</Notice>
      </AuthCard>
    </AuthShell>
  );
}
