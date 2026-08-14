import type { ReactNode } from "react";
import { SubmitButton } from "@/components/submit-button";
import { updateProfile } from "@/app/dashboard/profile/actions";
import {
  Visibility,
  type CoachSpecialty,
  type Handedness,
  type PlayerRole,
} from "@/app/generated/prisma/enums";
import { AvatarField } from "@/components/avatar-upload";
import { CountrySelect } from "@/components/country-select";
import { PhysicalFields } from "@/components/physical-fields";
import {
  CheckboxChip,
  Field,
  FieldGroup,
  Form,
  Kicker,
  Select,
  Switch,
  TextArea,
  TextInput,
} from "@/components/ui";
import { COACH_SPECIALTY_OPTIONS } from "@/lib/coaches";
import { PLAYER_ROLE_OPTIONS } from "@/lib/players";
import { HANDEDNESS_LABELS } from "@/lib/videos";

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
      <Select defaultValue={defaultValue ?? ""} name={name}>
        <option value="">Not set</option>
        {Object.entries(HANDEDNESS_LABELS).map(([key, optionLabel]) => (
          <option key={key} value={key}>
            {optionLabel}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function ProfileCard({
  action,
  children,
  kicker,
}: {
  action?: ReactNode;
  children: ReactNode;
  kicker: string;
}) {
  return (
    <section className="rounded-[10px] border border-cream-400 bg-cream-100 p-8">
      <div className="flex items-start justify-between gap-4">
        <Kicker>{kicker}</Kicker>
        {action}
      </div>
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
    visibility: Visibility;
    weightKg: number | null;
  };
  username: string | null;
}) {
  return (
    <ProfileCard
      action={
        <Switch
          defaultChecked={player.visibility === Visibility.PUBLIC}
          form="player-profile-form"
          name="visibility"
          offLabel="Private"
          onLabel="Public"
          value="public"
        />
      }
      kicker="Player profile"
    >
      <p className="-mt-2 mb-4 text-[12.5px] leading-relaxed text-ink-600">
        Public profiles appear in the player directory, where any approved coach
        can view your profile, videos, and coaching reports. Private profiles
        are visible only to coaches you&apos;re connected with.
      </p>
      <Form action={updateProfile} id="player-profile-form">
        <AvatarField
          avatarPath={player.avatarPath}
          avatarUrl={avatarUrl}
          initial={player.name.charAt(0).toUpperCase()}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            Name
            <TextInput
              defaultValue={player.name}
              name="name"
              required
              type="text"
            />
          </Field>
          <UsernameField username={username} />
          <Field>
            Club
            <TextInput
              defaultValue={player.club}
              name="club"
              required
              type="text"
            />
          </Field>
          <FieldGroup>
            Country
            <CountrySelect defaultValue={player.country} name="country" />
          </FieldGroup>
        </div>
        <PhysicalFields defaultHeight={player.heightCm} defaultWeight={player.weightKg} />
        <div className="grid gap-4 sm:grid-cols-2">
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
          <SubmitButton>Save changes</SubmitButton>
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
            <TextInput
              defaultValue={coach.name}
              name="name"
              required
              type="text"
            />
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
          <SubmitButton>Save changes</SubmitButton>
        </div>
      </Form>
    </ProfileCard>
  );
}
