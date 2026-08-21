"use client";

import { useActionState } from "react";
import { setAccountPassword, type AuthFormState } from "@/app/auth/actions";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Field, Form, Notice, SectionHeading } from "@/components/ui";

const empty: AuthFormState = {};

/** Password for signing in. OTP-era accounts that never set one can add it here. */
export function SetPasswordPanel() {
  const [state, action] = useActionState(setAccountPassword, empty);

  return (
    <section>
      <SectionHeading>Password</SectionHeading>
      <p className="mt-2 text-caption leading-relaxed text-ink-600">
        The password you use to sign in. Change it here if you want a new one.
      </p>
      <Form action={action} className="mt-3">
        <Field>
          <span className="sr-only">New password</span>
          <PasswordInput
            autoComplete="new-password"
            minLength={6}
            name="password"
            placeholder="New password"
            required
          />
        </Field>
        <SubmitButton className="w-full" variant="secondary">
          Save password
        </SubmitButton>
      </Form>
      <Notice className="mt-3" tone="error">
        {state.error}
      </Notice>
    </section>
  );
}
