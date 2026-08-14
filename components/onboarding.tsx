"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { completeOnboarding, signOut, type OnboardingState } from "@/app/auth/actions";
import { AuthStepper } from "@/components/auth-stepper";
import { PhysicalFields } from "@/components/physical-fields";
import { UsernameHandleField } from "@/components/username-field";
import {
  CheckboxChip,
  Field,
  FieldGroup,
  Form,
  Kicker,
  Notice,
  TextArea,
  TextInput,
  Wordmark,
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
  { description: string; kicker: string; submit: string; title: string }
> = {
  player: {
    description: "A few details for your player card. You can change these later.",
    kicker: "PLAYER",
    submit: "Create player profile",
    title: "You're in",
  },
  coach: {
    description: "Tell us who you are so we can review your coach account.",
    kicker: "COACH",
    submit: "Create coach profile",
    title: "Set up your coach profile",
  },
  guardian: {
    description: "Use the code on your child's dashboard to link their account.",
    kicker: "GUARDIAN",
    submit: "Link child's account",
    title: "Link your child’s account",
  },
};

export function OnboardingPanel({
  email,
  error,
  role = "player",
}: {
  email?: string;
  error?: string;
  role?: OnboardingRole;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center bg-cream-200 px-6 pt-24 pb-8 text-ink-900">
      <div className="absolute top-8 left-6 sm:left-12">
        <Wordmark tone="light" />
      </div>
      <div className="flex w-full flex-1 flex-col items-center justify-center py-8">
        <RoleForm error={error} key={role} role={role} />
      </div>
      <div className="mt-4 text-center text-[12.5px] text-ink-600">
        Signed in as {email} ·{" "}
        <form action={signOut} className="inline">
          <button
            className="cursor-pointer font-bold text-rust-600 hover:text-rust-700"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}

function RoleForm({ error, role }: { error?: string; role: OnboardingRole }) {
  const [state, action] = useActionState(completeOnboarding, emptyOnboarding);
  const [name, setName] = useState("");
  const copy = COPY[role];
  const dob = dobBounds();

  return (
    <section className="w-full max-w-[560px] rounded-xl border border-cream-400 bg-white p-9">
      <AuthStepper current="profile" />
      <Kicker>{copy.kicker}</Kicker>
      <h1 className="mt-2.5 font-display text-[26px] leading-tight font-bold uppercase">
        {copy.title}
      </h1>
      <p className="mt-2 text-sm text-ink-600">{copy.description}</p>
      <Form action={action} className="mt-6">
        <input name="role" type="hidden" value={role} />
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
        <UsernameHandleField nameValue={name} />
        {role === "player" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                Date of birth
                <TextInput max={dob.max} min={dob.min} name="dateOfBirth" required type="date" />
              </Field>
              <Field>
                Club
                <TextInput name="club" required type="text" />
              </Field>
            </div>
            <PhysicalFields />
            <CountryField />
            <RolesField />
          </>
        )}
        {role === "coach" && <CoachFields />}
        {role === "guardian" && <GuardianFields />}
        <SubmitButton>{copy.submit}</SubmitButton>
      </Form>
      <Notice tone="error">{state.error ?? error}</Notice>
      <RoleSwitchLinks role={role} />
    </section>
  );
}

function RoleSwitchLinks({ role }: { role: OnboardingRole }) {
  const linkClass =
    "font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline";

  if (role === "player") {
    return (
      <p className="mt-6 text-[13px] leading-relaxed text-ink-600">
        Signing up as a coach?{" "}
        <Link className={linkClass} href="/onboarding?role=coach">
          Set up a coach profile
        </Link>
        <br />
        Parent or guardian?{" "}
        <Link className={linkClass} href="/onboarding?role=guardian">
          Link a child&apos;s account
        </Link>
      </p>
    );
  }

  return (
    <p className="mt-6 text-[13px] leading-relaxed text-ink-600">
      <Link className={linkClass} href="/onboarding">
        I&apos;m a player
      </Link>
      {" · "}
      {role === "coach" ? (
        <Link className={linkClass} href="/onboarding?role=guardian">
          I&apos;m a parent or guardian
        </Link>
      ) : (
        <Link className={linkClass} href="/onboarding?role=coach">
          I&apos;m a coach
        </Link>
      )}
    </p>
  );
}

function CountryField() {
  return (
    <FieldGroup>
      Country
      <CountrySelect name="country" />
    </FieldGroup>
  );
}

function RolesField() {
  return (
    <FieldGroup>
      Playing roles
      <span className="text-xs font-normal text-ink-600">Optional. Select any that apply.</span>
      <div className="mt-1 flex flex-wrap gap-2">
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
        <TextInput name="childCode" placeholder="e.g. ABCD-2345" required type="text" />
        <span className="text-xs font-normal text-ink-600">
          Shown on your child&apos;s dashboard after they sign up.
        </span>
      </Field>
      <label className="flex items-start gap-2.5 text-[13px] leading-relaxed font-normal select-none">
        <input
          className="mt-0.5 size-4 shrink-0 accent-pitch-900"
          name="guardianConsent"
          required
          type="checkbox"
        />
        <span>
          I am this player&apos;s parent or legal guardian and consent to their use of
          NextXI.
        </span>
      </label>
    </>
  );
}

function CoachFields() {
  return (
    <Field>
      Accomplishments
      <TextArea
        name="accomplishments"
        placeholder="One accomplishment per line"
        rows={6}
      />
    </Field>
  );
}
