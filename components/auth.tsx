"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  requestEmailCode,
  requestPasswordReset,
  resendVerification,
  signIn,
  updatePassword,
  verifySignupOtp,
  type AuthFormState,
  type CheckEmailState,
} from "@/app/auth/actions";
import { OtpBoxes } from "@/components/otp-boxes";
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
  const isSignUp = mode === "sign-up";

  function switchMode(next: AuthMode) {
    setMode(next);
    window.history.replaceState(null, "", `/auth?mode=${next}`);
  }

  return (
    <AuthShell
      brandKicker={isSignUp ? "JOIN" : "GATE"}
      brandLine={
        isSignUp
          ? "Email a code. Confirm. Then earn the scoreboard."
          : "Upload technique. Earn the scoreboard."
      }
    >
      <div className="animate-crease-fade" key={mode}>
        <AuthCard
          description={
            isSignUp
              ? "We'll send a 6-digit code — no password to remember yet."
              : "We'll email you a code. Use a password if you already have one."
          }
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
          step={isSignUp ? "account" : undefined}
          title={isSignUp ? "Create account" : "Sign in"}
        >
          <AuthForm
            bannerError={mode === initialMode ? error : undefined}
            mode={mode}
          />
        </AuthCard>
      </div>
    </AuthShell>
  );
}

function AuthForm({
  bannerError,
  mode,
}: {
  bannerError?: string;
  mode: AuthMode;
}) {
  const isSignUp = mode === "sign-up";
  const [passwordMode, setPasswordMode] = useState(false);
  const [otpState, otpAction] = useActionState(requestEmailCode, emptyAuth);
  const [passwordState, passwordAction] = useActionState(signIn, emptyAuth);

  if (!isSignUp && passwordMode) {
    return (
      <>
        <Form action={passwordAction} className="mt-6">
          <Field>
            Email
            <TextInput autoComplete="email" name="email" required type="email" />
          </Field>
          <Field>
            <span className="flex items-baseline justify-between">
              Password
              <TextLink href="/auth/reset-password">Forgot your password?</TextLink>
            </span>
            <PasswordInput autoComplete="current-password" minLength={6} name="password" required />
          </Field>
          <SubmitButton variant="rust">Sign in</SubmitButton>
        </Form>
        <button
          className={`mt-3 ${modeLinkStyles}`}
          onClick={() => setPasswordMode(false)}
          type="button"
        >
          Email me a code instead
        </button>
        <Notice tone="error">{passwordState.error ?? bannerError}</Notice>
      </>
    );
  }

  return (
    <>
      <Form action={otpAction} className="mt-6">
        <input name="intent" type="hidden" value={isSignUp ? "sign-up" : "sign-in"} />
        <Field>
          Email
          <TextInput autoComplete="email" name="email" required type="email" />
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
        <SubmitButton variant="rust">Email me a code</SubmitButton>
      </Form>
      {!isSignUp && (
        <button
          className={`mt-3 ${modeLinkStyles}`}
          onClick={() => setPasswordMode(true)}
          type="button"
        >
          Sign in with a password
        </button>
      )}
      <Notice tone="error">{otpState.error ?? bannerError}</Notice>
    </>
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
            : "We will send you a link to set a password."
        }
        footer={<TextLink href="/auth">Back to sign in</TextLink>}
        kicker="PASSWORD"
        title={hasUser ? "Set a new password" : "Set a password"}
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
  const [address, setAddress] = useState(email);
  const [editingEmail, setEditingEmail] = useState(!email);
  const [otpState, otpAction] = useActionState(verifySignupOtp, emptyAuth);
  const [resendState, resendAction] = useActionState(resendVerification, emptyCheck);

  return (
    <AuthShell brandKicker="VERIFY" brandLine="Enter the code. Then earn the scoreboard.">
      <AuthCard
        description={
          address
            ? `We sent a 6-digit code to ${address}. It expires after a short time.`
            : "Enter the email you used and the 6-digit code from NextXI."
        }
        footer={<TextLink href="/auth">Back to sign in</TextLink>}
        kicker="INBOX"
        step="confirm"
        title="Check your email"
      >
        <Form action={otpAction} className="mt-6">
          {address && !editingEmail ? (
            <>
              <input name="email" type="hidden" value={address} />
              <button
                className="mb-1 w-fit cursor-pointer text-[13px] font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline"
                onClick={() => setEditingEmail(true)}
                type="button"
              >
                Use a different email
              </button>
            </>
          ) : (
            <Field>
              Email
              <TextInput
                autoComplete="email"
                name="email"
                onChange={(event) => setAddress(event.target.value)}
                required
                type="email"
                value={address}
              />
            </Field>
          )}
          <OtpBoxes />
          <SubmitButton variant="rust">Confirm and continue</SubmitButton>
        </Form>

        <Form action={resendAction} className="mt-3">
          <input name="email" type="hidden" value={address} />
          <ResendButton />
        </Form>

        <Notice>{resendState.message ?? message}</Notice>
        <Notice tone="error">{otpState.error ?? resendState.error ?? error}</Notice>
      </AuthCard>
    </AuthShell>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="cursor-pointer text-[13px] font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline disabled:cursor-default disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Sending…" : "Resend code"}
    </button>
  );
}
