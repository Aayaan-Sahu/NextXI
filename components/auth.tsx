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
import { AuthStepper } from "@/components/auth-stepper";
import { OtpBoxes } from "@/components/otp-boxes";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
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
            description="We email you a 6-digit code — no password needed to start."
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
      description="We'll email a 6-digit code to your address."
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
  const [otpState, otpAction] = useActionState(requestEmailCode, emptyAuth);

  return (
    <>
      <Form action={otpAction} className="mt-6">
        <input name="intent" type="hidden" value="sign-up" />
        <Field>
          Email
          <TextInput autoComplete="email" name="email" required type="email" />
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
        <SubmitButton className="w-full">Email me a code</SubmitButton>
      </Form>
      <Notice className="mt-4" tone="error">
        {otpState.error ?? bannerError}
      </Notice>
      <p className="mt-5 border-t border-cream-400 pt-4 text-caption leading-relaxed text-ink-600">
        Under-18s need a parent or guardian to approve their account after sign-up.
      </p>
    </>
  );
}

function SignInForm({ bannerError }: { bannerError?: string }) {
  const [passwordMode, setPasswordMode] = useState(false);
  const [otpState, otpAction] = useActionState(requestEmailCode, emptyAuth);
  const [passwordState, passwordAction] = useActionState(signIn, emptyAuth);

  if (passwordMode) {
    return (
      <>
        <Notice className="mt-5" tone="error">
          {passwordState.error ?? bannerError}
        </Notice>
        <p className="mt-4 text-ui text-ink-600">
          Password sign-in, for accounts that set one.
        </p>
        <Form action={passwordAction} className="mt-6">
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
            <FieldHint>Minimum 6 characters.</FieldHint>
          </Field>
          <SubmitButton className="w-full">Sign in</SubmitButton>
        </Form>
        <button
          className={`mt-4 w-full text-center ${inlineLinkStyles}`}
          onClick={() => setPasswordMode(false)}
          type="button"
        >
          Email me a code instead
        </button>
      </>
    );
  }

  return (
    <>
      <Form action={otpAction} className="mt-6">
        <input name="intent" type="hidden" value="sign-in" />
        <Field>
          Email
          <TextInput autoComplete="email" name="email" required type="email" />
        </Field>
        <SubmitButton className="w-full">Email me a code</SubmitButton>
      </Form>
      <button
        className={`mt-4 w-full text-center ${inlineLinkStyles}`}
        onClick={() => setPasswordMode(true)}
        type="button"
      >
        Sign in with a password
      </button>
      <Notice className="mt-4" tone="error">
        {otpState.error ?? bannerError}
      </Notice>
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
  const [editingEmail, setEditingEmail] = useState(!email);
  const [otpState, otpAction] = useActionState(verifySignupOtp, emptyAuth);
  const [resendState, resendAction] = useActionState(resendVerification, emptyCheck);

  const codeError = otpState.error ?? error;

  return (
    <AuthSheet
      context={<AuthStepper current="confirm" tone="dark" />}
      description={
        address
          ? `We sent a 6-digit code to ${address}. It expires after a short time.`
          : "Enter the email you used and the 6-digit code from NextXI."
      }
      footer={<TextLink href="/auth">← Back to sign in</TextLink>}
      title="Check your email"
    >
      <Notice className="mt-5" tone="error">
        {codeError ?? resendState.error}
      </Notice>

      <Form action={otpAction} className="mt-6">
        {address && !editingEmail ? (
          <input name="email" type="hidden" value={address} />
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
        <div>
          <OtpBoxes invalid={Boolean(codeError)} />
          <p className="mt-2.5 text-caption text-ink-600">
            Paste the whole code and it fills every box.
          </p>
        </div>
        <SubmitButton className="w-full">Confirm and continue</SubmitButton>
      </Form>

      <div className="mt-5 flex items-center gap-[18px] text-ui font-semibold">
        <form action={resendAction}>
          <input name="email" type="hidden" value={address} />
          <ResendButton />
        </form>
        {address && !editingEmail ? (
          <button className={inlineLinkStyles} onClick={() => setEditingEmail(true)} type="button">
            Use a different email
          </button>
        ) : null}
      </div>

      <Notice className="mt-4">{resendState.message ?? message}</Notice>
    </AuthSheet>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={`${inlineLinkStyles} disabled:cursor-default disabled:opacity-60`}
      disabled={pending}
      type="submit"
    >
      {pending ? "Sending…" : "Resend code"}
    </button>
  );
}
