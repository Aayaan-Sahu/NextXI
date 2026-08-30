"use client";

import { useActionState, useState } from "react";
import {
  resendVerification,
  signIn,
  signUp,
  requestPasswordReset,
  updatePassword,
  type AuthFormState,
  type CheckEmailState,
} from "@/app/auth/actions";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { UsernameHandleField } from "@/components/username-field";
import {
  AuthCard,
  AuthSheet,
  AuthShell,
  Field,
  FieldHint,
  Form,
  Notice,
  TextInput,
  TextLink,
} from "@/components/ui";

type AuthMode = "sign-in" | "sign-up";

const inlineLinkStyles =
  "cursor-pointer font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline";

const emptyAuth: AuthFormState = {};
const emptyCheck: CheckEmailState = {};

export function AuthPanel({
  error,
  mode: initialMode,
}: {
  error?: string;
  mode: AuthMode;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  function switchMode(next: AuthMode) {
    setMode(next);
    window.history.replaceState(null, "", `/auth?mode=${next}`);
  }

  const bannerError = mode === initialMode ? error : undefined;

  if (mode === "sign-up") {
    return (
      <AuthShell brandLine="Film it. Understand it.">
        <div className="animate-crease-fade" key={mode}>
          <AuthCard
            description="A handle, an email, a password. We'll email a link — you need that to open the account."
            footer={
              <>
                Already have an account?{" "}
                <button
                  className={inlineLinkStyles}
                  onClick={() => switchMode("sign-in")}
                  type="button"
                >
                  Sign in
                </button>
              </>
            }
            step="account"
            title="Create your account"
          >
            <SignUpForm bannerError={bannerError} />
          </AuthCard>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthSheet
      description="Email and password — the ones you used to create the account."
      footer={
        <>
          New here?{" "}
          <button className={inlineLinkStyles} onClick={() => switchMode("sign-up")} type="button">
            Create an account
          </button>
        </>
      }
      title="Sign in"
    >
      <SignInForm bannerError={bannerError} key={mode} />
    </AuthSheet>
  );
}

function SignUpForm({ bannerError }: { bannerError?: string }) {
  const [state, action] = useActionState(signUp, emptyAuth);

  return (
    <>
      <Form action={action} className="mt-6">
        <UsernameHandleField suggestFromName={false} />
        <Field>
          Email
          <TextInput autoComplete="email" name="email" required type="email" />
        </Field>
        <Field>
          Password
          <PasswordInput autoComplete="new-password" minLength={6} name="password" required />
          <FieldHint>Minimum 6 characters.</FieldHint>
        </Field>
        <Field>
          Confirm password
          <PasswordInput
            autoComplete="new-password"
            minLength={6}
            name="confirmPassword"
            required
          />
        </Field>
        <label className="flex items-start gap-2.5 text-ui leading-relaxed select-none">
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
        <SubmitButton className="w-full">Create account</SubmitButton>
      </Form>
      <Notice className="mt-4" tone="error">
        {state.error ?? bannerError}
      </Notice>
      <div className="mt-5 border-t border-cream-400 pt-4">
        <p className="text-caption leading-relaxed text-ink-600">
          Under-18s get a code to invite a parent or guardian onto the account
          once they&apos;re in.
        </p>
        <SupabaseMailNote divider={false} kind="verification" />
      </div>
    </>
  );
}

function SignInForm({ bannerError }: { bannerError?: string }) {
  const [state, action] = useActionState(signIn, emptyAuth);

  return (
    <>
      <Notice className="mt-5" tone="error">
        {state.error ?? bannerError}
      </Notice>
      <Form action={action} className="mt-6">
        <Field>
          Email
          <TextInput autoComplete="email" name="email" required type="email" />
        </Field>
        <Field>
          <span className="flex items-baseline justify-between gap-3">
            Password
            <TextLink className="text-caption" href="/auth/reset-password">
              Forgot your password?
            </TextLink>
          </span>
          <PasswordInput autoComplete="current-password" minLength={6} name="password" required />
        </Field>
        <SubmitButton className="w-full">Sign in</SubmitButton>
      </Form>
    </>
  );
}

/**
 * TEMPORARY — delete this component and its three call sites once custom SMTP
 * is live (issue #41) and the templates in `supabase/templates/` are pushed
 * with `bun run auth:templates`.
 *
 * Until then Supabase's own default mailer sends every auth email, so what
 * lands is generic and unbranded and often filed as spam. People assume a
 * NextXI email failed to arrive and give up on the sign-up. Saying so up front
 * costs one sentence and saves the account.
 */
function SupabaseMailNote({
  divider = true,
  kind,
}: {
  /** Off where the note joins a block that already carries the hairline. */
  divider?: boolean;
  kind: "verification" | "reset";
}) {
  return (
    <div className={divider ? "mt-6 border-t border-cream-400 pt-4" : "mt-3"}>
      <p className="text-caption leading-relaxed text-ink-600">
        The {kind} email is sent by Supabase, our auth provider, so the sender
        and styling are theirs and not ours yet — the link inside is still
        NextXI&apos;s. If it isn&apos;t in your inbox within a minute, check spam
        or junk.
        {kind === "verification"
          ? " Open the link on the same device you signed up on; on another one it can fail."
          : ""}{" "}
        We&apos;re moving to NextXI-branded mail shortly.
      </p>
    </div>
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
    <AuthSheet
      description={
        hasUser
          ? "You arrived from the reset email, so you're signed in already."
          : "We'll email a link so you can set or change your password."
      }
      footer={<TextLink href="/auth">← Back to sign in</TextLink>}
      title={hasUser ? "Set a new password" : "Set a password"}
    >
      <Form action={hasUser ? updatePassword : requestPasswordReset} className="mt-6">
        {hasUser ? (
          <Field>
            New password
            <PasswordInput autoComplete="new-password" minLength={6} name="password" required />
            <FieldHint>Minimum 6 characters.</FieldHint>
          </Field>
        ) : (
          <Field>
            Email
            <TextInput
              autoComplete="email"
              name="email"
              placeholder="you@club.com"
              required
              type="email"
            />
          </Field>
        )}
        <SubmitButton className="w-full">
          {hasUser ? "Update password" : "Send reset email"}
        </SubmitButton>
      </Form>

      <Notice className="mt-4">{message}</Notice>
      <Notice className="mt-4" tone="error">
        {error}
      </Notice>

      {hasUser ? null : <SupabaseMailNote kind="reset" />}
    </AuthSheet>
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
  const [address, setAddress] = useState(email);
  const [resendState, resendAction] = useActionState(resendVerification, emptyCheck);

  return (
    <AuthSheet
      description={
        address
          ? `We sent a verification link to ${address}. Open it and you go straight to setting up your profile — no code to type.`
          : "Enter the email you used and we'll send a verification link."
      }
      footer={<TextLink href="/auth">← Back to sign in</TextLink>}
      title="Verify your email"
    >
      <Notice className="mt-5" tone="error">
        {error ?? resendState.error}
      </Notice>

      <SupabaseMailNote kind="verification" />

      <Form action={resendAction} className="mt-6">
        <Field>
          Didn&apos;t get it? Resend to
          <TextInput
            autoComplete="email"
            name="email"
            onChange={(event) => setAddress(event.target.value)}
            required
            type="email"
            value={address}
          />
        </Field>
        <SubmitButton className="w-full">Resend verification email</SubmitButton>
      </Form>

      <Notice className="mt-4">{resendState.message ?? message}</Notice>
    </AuthSheet>
  );
}
