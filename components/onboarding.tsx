import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { completeOnboarding, signOut } from "@/app/auth/actions";
import {
  CheckboxChip,
  Field,
  FieldGroup,
  Form,
  Kicker,
  Notice,
  TextArea,
  TextInput,
  TextLink,
  Wordmark,
} from "@/components/ui";
import { CountrySelect } from "@/components/country-select";
import { PLAYER_ROLE_OPTIONS } from "@/lib/players";

export type OnboardingRole = "player" | "coach" | "guardian";

export function OnboardingPanel({
  email,
  error,
  role,
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
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        {role ? <RoleForm error={error} role={role} /> : <RoleChoice error={error} />}
      </div>
      <div className="mt-10 text-center text-[12.5px] text-ink-600">
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

function RoleChoice({ error }: { error?: string }) {
  return (
    <>
      <h1 className="text-center font-display text-[34px] leading-tight font-bold tracking-[.02em] uppercase">
        How will you use NextXI?
      </h1>
      <p className="mt-2.5 text-center text-[15px] text-ink-600">
        Choose a role to finish setting up your account.
      </p>
      <nav aria-label="Choose your role" className="mt-10 flex flex-wrap justify-center gap-5">
        <RoleOption
          description="Build your profile and share videos of your game with coaches."
          href="/onboarding?role=player"
          kicker="Player"
          title="I'm a player"
        />
        <RoleOption
          description="Discover players and review their videos."
          href="/onboarding?role=coach"
          kicker="Coach"
          title="I'm a coach"
          tone="dark"
        />
        <RoleOption
          description="Approve and follow your child's player account."
          href="/onboarding?role=guardian"
          kicker="Guardian"
          title="I'm a parent / guardian"
        />
      </nav>
      <Notice tone="error">{error}</Notice>
    </>
  );
}

function RoleOption({
  description,
  href,
  kicker,
  title,
  tone = "light",
}: {
  description: string;
  href: string;
  kicker: string;
  title: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <Link
      className={`w-[280px] rounded-xl p-7 no-underline ${
        dark
          ? "bg-pitch-900 text-cream-200 hover:bg-pitch-800"
          : "border border-cream-400 bg-white hover:border-cream-500"
      }`}
      href={href}
    >
      <Kicker tone={dark ? "dark" : "light"}>{kicker}</Kicker>
      <span className="mt-3 block font-display text-[22px] leading-tight font-semibold uppercase">
        {title}
      </span>
      <span
        className={`mt-2.5 block text-[13.5px] leading-relaxed ${
          dark ? "text-sage-400" : "text-ink-600"
        }`}
      >
        {description}
      </span>
    </Link>
  );
}

function RoleForm({ error, role }: { error?: string; role: OnboardingRole }) {
  return (
    <>
      <section className="w-full max-w-[560px] rounded-xl border border-cream-400 bg-white p-9">
        <h1 className="font-display text-[26px] leading-tight font-bold uppercase">
          Set up your {role} profile
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          Tell us a bit about yourself to finish setting up.
        </p>
        <Form action={completeOnboarding} className="mt-6">
          <input name="role" type="hidden" value={role} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              Name
              <TextInput name="name" required type="text" />
            </Field>
            <Field>
              Username
              <TextInput
                name="username"
                pattern="[A-Za-z0-9_]{3,30}"
                required
                title="Use 3-30 letters, numbers, or underscores."
                type="text"
              />
            </Field>
            {role === "player" && <PlayerGridFields />}
          </div>
          {role === "player" ? (
            <>
              <CountryField />
              <RolesField />
            </>
          ) : role === "coach" ? (
            <CoachFields />
          ) : (
            <GuardianFields />
          )}
          <SubmitButton>Create {role} profile</SubmitButton>
        </Form>
        <Notice tone="error">{error}</Notice>
      </section>
      <p className="mt-4 text-center text-[13px]">
        <TextLink href="/onboarding">&larr; Choose a different role</TextLink>
      </p>
    </>
  );
}

function PlayerGridFields() {
  return (
    <>
      <Field>
        Date of birth
        <TextInput name="dateOfBirth" required type="date" />
      </Field>
      <Field>
        Club
        <TextInput name="club" required type="text" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          Height (cm)
          <TextInput max={300} min={1} name="heightCm" required type="number" />
        </Field>
        <Field>
          Weight (kg)
          <TextInput max={500} min={1} name="weightKg" placeholder="Optional" type="number" />
        </Field>
      </div>
    </>
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
