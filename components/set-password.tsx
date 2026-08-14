"use client";

import { useActionState } from "react";
import { setAccountPassword, type AuthFormState } from "@/app/auth/actions";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Field, Form, Kicker, Notice } from "@/components/ui";

const empty: AuthFormState = {};

/** Optional password so OTP-first accounts can sign in without a code next time. */
export function SetPasswordPanel() {
  const [state, action] = useActionState(setAccountPassword, empty);

  return (
    <section className="rounded-[10px] border border-cream-400 bg-cream-100 p-8">
      <Kicker>Password</Kicker>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-600">
        Optional. Set one if you&apos;d rather sign in without waiting for an email code.
      </p>
      <Form action={action} className="mt-5">
        <Field>
          New password
          <PasswordInput
            autoComplete="new-password"
            minLength={6}
            name="password"
            required
          />
        </Field>
        <SubmitButton>Save password</SubmitButton>
      </Form>
      <Notice tone="error">{state.error}</Notice>
    </section>
  );
}
