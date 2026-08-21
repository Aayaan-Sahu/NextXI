"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { completeOnboarding, signOut, type OnboardingState } from "@/app/auth/actions";
import { AuthStepper } from "@/components/auth-stepper";
import { PhysicalFields } from "@/components/physical-fields";
import { UsernameHandleField } from "@/components/username-field";
import {
  AuthSheet,
  CheckboxChip,
  Field,
  FieldGroup,
  FieldHint,
  Form,
  Notice,
  TextArea,
  TextInput,
} from "@/components/ui";
import { CountrySelect } from "@/components/country-select";
import { PLAYER_ROLE_OPTIONS } from "@/lib/players";

export type OnboardingRole = "player" | "coach" | "guardian";

const emptyOnboarding: OnboardingState = {};

function dobBounds() {
  const now = new Date();
  const utc = (yearsAgo: number) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear() - yearsAgo, now.getUTCMonth(), now.getUTCDate()),
    );
    return date.toISOString().slice(0, 10);
  };

  return { max: utc(8), min: utc(100) };
}

const COPY: Record<
  OnboardingRole,
  { description: string; submit: string; title: string }
> = {
  player: {
    description:
      "Height is required — every measurement in your reports is calibrated against it.",
    submit: "Create my profile",
    title: "Your player profile",
  },
  coach: {
    description: "An administrator reviews every coach account before it opens.",
    submit: "Submit for review",
    title: "Coach profile",
  },
  guardian: {
    description: "Your child's code appears on their dashboard right after they sign up.",
    submit: "Link my child",
    title: "Guardian profile",
  },
};

export function OnboardingPanel({
  email,
  error,
  role = "player",
  username,
}: {
  email?: string;
  error?: string;
  role?: OnboardingRole;
  username?: string | null;
}) {
  const copy = COPY[role];
  const isPlayer = role === "player";

  return (
    <AuthSheet
      context={isPlayer ? <AuthStepper current="profile" tone="dark" /> : undefined}
      description={copy.description}
      footer={
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
          <RoleSwitchLinks role={role} />
          {email ? (
            <span>
              {email} ·{" "}
              <form action={signOut} className="inline">
                <button
                  className="cursor-pointer font-semibold text-rust-600 hover:text-rust-700"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </span>
          ) : null}
        </span>
      }
      title={copy.title}
      width={isPlayer ? "lg" : "sm"}
    >
      <RoleForm
        error={error}
        key={role}
        reservedUsername={username}
        role={role}
        submit={copy.submit}
      />
    </AuthSheet>
  );
}

function RoleForm({
  error,
  reservedUsername,
  role,
  submit,
}: {
  error?: string;
  reservedUsername?: string | null;
  role: OnboardingRole;
  submit: string;
}) {
  const [state, action] = useActionState(completeOnboarding, emptyOnboarding);
  const [name, setName] = useState("");
  const dob = dobBounds();

  return (
    <>
      <Notice className="mt-5" tone="error">
        {state.error ?? error}
      </Notice>
      <Form action={action} className="mt-6">
        <input name="role" type="hidden" value={role} />
        <p className="-mt-1 text-caption leading-relaxed text-ink-600">
          We emailed a verification link. Click it whenever — it doesn&apos;t block you.
        </p>
        {role === "player" ? (
          <>
            <div className="grid items-start gap-x-5 gap-y-[18px] sm:grid-cols-2">
              <Field>
                Name
                <TextInput
                  autoComplete="name"
                  name="name"
                  onChange={(event) => setName(event.target.value)}
                  required
                  type="text"
                  value={name}
                />
              </Field>
              <UsernameSlot nameValue={name} reserved={reservedUsername} />
              <Field>
                Date of birth
                <TextInput max={dob.max} min={dob.min} name="dateOfBirth" required type="date" />
              </Field>
              <Field>
                Club
                <TextInput name="club" required type="text" />
              </Field>
              <div className="sm:col-span-2">
                <CountryField />
              </div>
              <PhysicalFields className="sm:col-span-2" />
            </div>
            <RolesField />
          </>
        ) : (
          <>
            <Field>
              Name
              <TextInput
                autoComplete="name"
                name="name"
                onChange={(event) => setName(event.target.value)}
                required
                type="text"
                value={name}
              />
            </Field>
            <UsernameSlot nameValue={name} reserved={reservedUsername} />
            {role === "coach" ? <CoachFields /> : <GuardianFields />}
          </>
        )}
        <SubmitButton className="mt-2 w-full">{submit}</SubmitButton>
      </Form>
    </>
  );
}

const roleLinkClass = "font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline";

function RoleSwitchLinks({ role }: { role: OnboardingRole }) {
  if (role === "player") {
    return (
      <span>
        Not a player?{" "}
        <Link className={roleLinkClass} href="/onboarding?role=coach">
          I&apos;m a coach
        </Link>
        {" · "}
        <Link className={roleLinkClass} href="/onboarding?role=guardian">
          I&apos;m a parent or guardian
        </Link>
      </span>
    );
  }

  return (
    <span>
      <Link className={roleLinkClass} href="/onboarding">
        I&apos;m a player
      </Link>
      {" · "}
      {role === "coach" ? (
        <Link className={roleLinkClass} href="/onboarding?role=guardian">
          I&apos;m a parent or guardian
        </Link>
      ) : (
        <Link className={roleLinkClass} href="/onboarding?role=coach">
          I&apos;m a coach
        </Link>
      )}
    </span>
  );
}

function UsernameSlot({
  nameValue,
  reserved,
}: {
  nameValue: string;
  reserved?: string | null;
}) {
  if (reserved) {
    return (
      <Field>
        Username
        <input name="username" type="hidden" value={reserved} />
        <p className="text-body font-normal text-ink-900">@{reserved}</p>
        <FieldHint>Picked when you created the account.</FieldHint>
      </Field>
    );
  }

  return <UsernameHandleField nameValue={nameValue} />;
}

function CountryField() {
  return (
    <FieldGroup>
      Country
      <CountrySelect name="country" />
      <FieldHint>19 options, England by default.</FieldHint>
    </FieldGroup>
  );
}

function RolesField() {
  return (
    <FieldGroup className="mt-2">
      <span>
        Playing roles <span className="font-normal text-ink-600">optional</span>
      </span>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {PLAYER_ROLE_OPTIONS.map((role) => (
          <CheckboxChip key={role.value} name="roles" value={role.value}>
            {role.label}
          </CheckboxChip>
        ))}
      </div>
    </FieldGroup>
  );
}

function GuardianFields() {
  return (
    <>
      <Field>
        Child&apos;s approval code
        <TextInput
          className="font-semibold tracking-[.14em]"
          name="childCode"
          placeholder="e.g. ABCD-2345"
          required
          type="text"
        />
        <FieldHint>Spaces, hyphens and case don&apos;t matter.</FieldHint>
      </Field>
      <label className="flex items-start gap-2.5 text-ui leading-relaxed font-normal select-none">
        <input
          className="mt-0.5 size-4 shrink-0 accent-pitch-900"
          name="guardianConsent"
          required
          type="checkbox"
        />
        <span>
          I am this player&apos;s parent or legal guardian and consent to their use of NextXI.
        </span>
      </label>
    </>
  );
}

function CoachFields() {
  return (
    <Field>
      <span>
        Accomplishments <span className="font-normal text-ink-600">one per line, optional</span>
      </span>
      <TextArea name="accomplishments" placeholder="e.g. ECB Level 3, batting" rows={4} />
    </Field>
  );
}
