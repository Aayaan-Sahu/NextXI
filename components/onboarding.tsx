import Link from "next/link";
import { completeOnboarding, signOut } from "@/app/auth/actions";
import {
  AuthCard,
  AuthShell,
  Field,
  Form,
  Notice,
  PrimaryButton,
  TextArea,
  TextInput,
  TextLink,
} from "@/components/ui";

export type OnboardingRole = "player" | "coach";

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
    <AuthShell>
      <AuthCard
        description={
          role
            ? "Tell us a bit about yourself to finish setting up."
            : "Choose a role to finish setting up your account."
        }
        footer={
          <>
            Signed in as {email} ·{" "}
            <form action={signOut} className="inline">
              <button
                className="cursor-pointer font-medium text-emerald-700 underline-offset-2 hover:underline"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </>
        }
        title={role ? `Set up your ${role} profile` : "How will you use Cricket Platform?"}
      >
        {role ? <RoleForm role={role} /> : <RoleChoice />}
        <Notice tone="error">{error}</Notice>
      </AuthCard>
    </AuthShell>
  );
}

function RoleChoice() {
  return (
    <nav aria-label="Choose your role" className="mt-6 grid gap-3">
      <RoleOption
        description="Build your profile and share videos of your game with coaches."
        href="/onboarding?role=player"
        title="I'm a player"
      />
      <RoleOption
        description="Discover players and review their videos."
        href="/onboarding?role=coach"
        title="I'm a coach"
      />
    </nav>
  );
}

function RoleOption({
  description,
  href,
  title,
}: {
  description: string;
  href: string;
  title: string;
}) {
  return (
    <Link
      className="rounded-lg border border-stone-300 p-4 no-underline hover:border-emerald-600 hover:bg-emerald-50/50"
      href={href}
    >
      <span className="block font-semibold text-neutral-950">{title}</span>
      <span className="mt-1 block text-sm text-stone-600">{description}</span>
    </Link>
  );
}

function RoleForm({ role }: { role: OnboardingRole }) {
  return (
    <>
      <Form action={completeOnboarding} className="mt-6">
        <input name="role" type="hidden" value={role} />
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
        {role === "player" ? <PlayerFields /> : <CoachFields />}
        <PrimaryButton type="submit">Create {role} profile</PrimaryButton>
      </Form>
      <p className="mt-4 text-sm">
        <TextLink href="/onboarding">&larr; Choose a different role</TextLink>
      </p>
    </>
  );
}

function PlayerFields() {
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
      <Field>
        Country
        <TextInput name="country" required type="text" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field>
          Height (cm)
          <TextInput max={300} min={1} name="heightCm" placeholder="Optional" type="number" />
        </Field>
        <Field>
          Weight (kg)
          <TextInput max={500} min={1} name="weightKg" placeholder="Optional" type="number" />
        </Field>
      </div>
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
