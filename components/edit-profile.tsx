import type { ReactNode } from "react";
import { updateProfile } from "@/app/dashboard/profile/actions";
import type { CoachSpecialty, Handedness, PlayerRole } from "@/app/generated/prisma/enums";
import { AvatarField } from "@/components/avatar-upload";
import { CountrySelect } from "@/components/country-select";
import { CheckboxChip, Field, FieldGroup, Form, Kicker, PrimaryButton, TextArea, TextInput } from "@/components/ui";
import { COACH_SPECIALTY_OPTIONS } from "@/lib/coaches";
import { PLAYER_ROLE_OPTIONS } from "@/lib/players";
import { HANDEDNESS_LABELS } from "@/lib/videos";

const selectStyles =
  "rounded-md border border-cream-400 bg-cream-50 px-3 py-2.5 text-sm font-normal text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/25";

function HandednessSelect({
  defaultValue,
  label,
  name,
}: {
  defaultValue: Handedness | null;
  label: string;
  name: string;
}) {
  return (
    <Field>
      {label}
      <select className={selectStyles} defaultValue={defaultValue ?? ""} name={name}>
        <option value="">Not set</option>
        {Object.entries(HANDEDNESS_LABELS).map(([key, optionLabel]) => (
          <option key={key} value={key}>
            {optionLabel}
          </option>
        ))}
      </select>
    </Field>
  );
}

function ProfileCard({ children, kicker }: { children: ReactNode; kicker: string }) {
  return (
    <section className="rounded-[10px] border border-cream-400 bg-cream-100 p-8">
      <Kicker>{kicker}</Kicker>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function UsernameField({ username }: { username: string | null }) {
  return (
    <Field>
      Username
      <TextInput
        defaultValue={username ?? ""}
        name="username"
        pattern="[A-Za-z0-9_]{3,30}"
        required
        title="Use 3-30 letters, numbers, or underscores."
        type="text"
      />
    </Field>
  );
}

export function EditPlayerProfilePanel({
  avatarUrl,
  player,
  username,
}: {
  avatarUrl: string | null;
  player: {
    avatarPath: string | null;
    battingHandedness: Handedness | null;
    bio: string | null;
    bowlingHandedness: Handedness | null;
    club: string;
    country: string;
    heightCm: number;
    name: string;
    roles: PlayerRole[];
    weightKg: number | null;
  };
  username: string | null;
}) {
  return (
    <ProfileCard kicker="Player profile">
      <Form action={updateProfile}>
        <AvatarField
          avatarPath={player.avatarPath}
          avatarUrl={avatarUrl}
          initial={player.name.charAt(0).toUpperCase()}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            Name
            <TextInput defaultValue={player.name} name="name" required type="text" />
          </Field>
          <UsernameField username={username} />
          <Field>
            Club
            <TextInput defaultValue={player.club} name="club" required type="text" />
          </Field>
          <FieldGroup>
            Country
            <CountrySelect defaultValue={player.country} name="country" />
          </FieldGroup>
          <Field>
            Height (cm)
            <TextInput
              defaultValue={player.heightCm}
              max={300}
              min={1}
              name="heightCm"
              required
              type="number"
            />
          </Field>
          <Field>
            Weight (kg)
            <TextInput
              defaultValue={player.weightKg ?? ""}
              max={500}
              min={1}
              name="weightKg"
              placeholder="Optional"
              type="number"
            />
          </Field>
          <HandednessSelect
            defaultValue={player.battingHandedness}
            label="Batting handedness"
            name="battingHandedness"
          />
          <HandednessSelect
            defaultValue={player.bowlingHandedness}
            label="Bowling handedness"
            name="bowlingHandedness"
          />
        </div>
        <FieldGroup>
          Playing roles
          <div className="flex flex-wrap gap-2">
            {PLAYER_ROLE_OPTIONS.map((role) => (
              <CheckboxChip
                defaultChecked={player.roles.includes(role.value)}
                key={role.value}
                name="roles"
                value={role.value}
              >
                {role.label}
              </CheckboxChip>
            ))}
          </div>
          <span className="text-xs font-normal text-ink-600">
            Optional. Select any that apply.
          </span>
        </FieldGroup>
        <Field>
          Bio
          <TextArea
            defaultValue={player.bio ?? ""}
            maxLength={500}
            name="bio"
            placeholder="A short introduction — up to 500 characters."
            rows={4}
          />
        </Field>
        <div className="mt-1.5">
          <PrimaryButton type="submit">Save changes</PrimaryButton>
        </div>
      </Form>
    </ProfileCard>
  );
}

export function EditCoachProfilePanel({
  avatarUrl,
  coach,
  username,
}: {
  avatarUrl: string | null;
  coach: {
    avatarPath: string | null;
    bio: string | null;
    certifications: string[];
    club: string | null;
    name: string;
    specialties: CoachSpecialty[];
  };
  username: string | null;
}) {
  return (
    <ProfileCard kicker="Coach profile">
      <Form action={updateProfile}>
        <AvatarField
          avatarPath={coach.avatarPath}
          avatarUrl={avatarUrl}
          initial={coach.name.charAt(0).toUpperCase()}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            Name
            <TextInput defaultValue={coach.name} name="name" required type="text" />
          </Field>
          <UsernameField username={username} />
          <Field>
            Club
            <TextInput
              defaultValue={coach.club ?? ""}
              name="club"
              placeholder="Optional"
              type="text"
            />
          </Field>
        </div>
        <FieldGroup>
          Coaching specialties
          <div className="flex flex-wrap gap-2">
            {COACH_SPECIALTY_OPTIONS.map((specialty) => (
              <CheckboxChip
                defaultChecked={coach.specialties.includes(specialty.value)}
                key={specialty.value}
                name="specialties"
                value={specialty.value}
              >
                {specialty.label}
              </CheckboxChip>
            ))}
          </div>
          <span className="text-xs font-normal text-ink-600">
            Optional. Select any that apply.
          </span>
        </FieldGroup>
        <Field>
          Bio
          <TextArea
            defaultValue={coach.bio ?? ""}
            maxLength={500}
            name="bio"
            placeholder="A short introduction — up to 500 characters."
            rows={4}
          />
        </Field>
        <Field>
          Certifications
          <TextArea
            defaultValue={coach.certifications.join("\n")}
            name="certifications"
            placeholder="One certification per line, e.g. ECB Level 2"
            rows={4}
          />
        </Field>
        <div className="mt-1.5">
          <PrimaryButton type="submit">Save changes</PrimaryButton>
        </div>
      </Form>
    </ProfileCard>
  );
}
