import { SubmitButton } from "@/components/submit-button";
import { updateProfile } from "@/app/dashboard/profile/actions";
import {
  Visibility,
  type CoachSpecialty,
  type Handedness,
  type PlayerRole,
} from "@/app/generated/prisma/enums";
import { CountrySelect } from "@/components/country-select";
import { PhysicalFields } from "@/components/physical-fields";
import {
  CheckboxChip,
  Field,
  FieldGroup,
  FieldHint,
  Form,
  SectionHeading,
  Select,
  Switch,
  TextArea,
  TextInput,
} from "@/components/ui";
import { COACH_SPECIALTY_OPTIONS } from "@/lib/coaches";
import { PLAYER_ROLE_OPTIONS } from "@/lib/players";
import { HANDEDNESS_LABELS } from "@/lib/videos";

export const PROFILE_FORM_ID = "profile-form";

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

function UsernameField({ username }: { username: string | null }) {
  return (
    <Field>
      Username
      <span className="flex items-center gap-1 rounded-md border border-cream-400 bg-cream-50 px-3 focus-within:border-ink-900 focus-within:ring-2 focus-within:ring-amber-500/30">
        <span className="text-body text-ink-600">@</span>
        <input
          className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-base font-normal text-ink-900 focus:outline-none sm:pointer-fine:text-body"
          defaultValue={username ?? ""}
          name="username"
          pattern="[A-Za-z0-9_]{3,30}"
          required
          title="Use 3-30 letters, numbers, or underscores."
          type="text"
        />
      </span>
      <FieldHint>3–30 characters, letters, numbers and underscores.</FieldHint>
    </Field>
  );
}

/**
 * The visibility switch, above the form it belongs to. It is the one setting on
 * this page with a consequence outside the account, so it gets its own row and
 * its own sentence rather than sitting in a column of fields.
 */
export function VisibilityRow({ visibility }: { visibility: Visibility }) {
  const isPublic = visibility === Visibility.PUBLIC;

  return (
    <div className="flex items-center justify-between gap-6 rounded-lg border border-cream-400 bg-cream-50 px-5 py-4 max-sm:flex-col max-sm:items-start">
      <div>
        <p className="text-ui font-semibold">
          Profile visibility · {isPublic ? "Public" : "Private"}
        </p>
        <p className="mt-1 max-w-[640px] text-caption leading-relaxed text-ink-600">
          Any approved coach can find you in the player directory and view your profile, videos
          and coaching reports without connecting. Switch to private and only connected coaches
          can see you.
        </p>
      </div>
      <Switch
        className="shrink-0"
        defaultChecked={isPublic}
        form={PROFILE_FORM_ID}
        name="visibility"
        offLabel="Private"
        onLabel="Public"
        value="public"
      />
    </div>
  );
}

export function EditPlayerProfilePanel({
  player,
  username,
}: {
  player: {
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
    <section>
      <SectionHeading>Player details</SectionHeading>
      <Form action={updateProfile} className="mt-[18px]" id={PROFILE_FORM_ID}>
        <div className="grid items-start gap-x-5 gap-y-[18px] sm:grid-cols-2">
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
          <PhysicalFields defaultHeight={player.heightCm} defaultWeight={player.weightKg} />
          <div className="grid grid-cols-2 gap-3.5">
            <HandednessSelect
              defaultValue={player.battingHandedness}
              label="Batting hand"
              name="battingHandedness"
            />
            <HandednessSelect
              defaultValue={player.bowlingHandedness}
              label="Bowling hand"
              name="bowlingHandedness"
            />
          </div>
        </div>

        <FieldGroup className="mt-1.5">
          Playing roles
          <div className="mt-1.5 flex flex-wrap gap-2">
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
        </FieldGroup>

        <Field>
          <span>
            Bio <span className="font-normal text-ink-600">max 500</span>
          </span>
          <TextArea
            defaultValue={player.bio ?? ""}
            maxLength={500}
            name="bio"
            placeholder="A short introduction."
            rows={3}
          />
        </Field>

        <div className="mt-1.5 flex flex-wrap items-center gap-4">
          <SubmitButton>Save changes</SubmitButton>
          <span className="text-caption text-ink-600">
            Date of birth can&apos;t be changed — it fixes the under-18 safeguards on your
            account.
          </span>
        </div>
      </Form>
    </section>
  );
}

export function EditCoachProfilePanel({
  coach,
  username,
}: {
  coach: {
    bio: string | null;
    certifications: string[];
    club: string | null;
    name: string;
    specialties: CoachSpecialty[];
  };
  username: string | null;
}) {
  return (
    <section>
      <SectionHeading>Coach details</SectionHeading>
      <Form action={updateProfile} className="mt-[18px]" id={PROFILE_FORM_ID}>
        <div className="grid items-start gap-x-5 gap-y-[18px] sm:grid-cols-2">
          <Field>
            Name
            <TextInput defaultValue={coach.name} name="name" required type="text" />
          </Field>
          <UsernameField username={username} />
          <Field className="sm:col-span-2">
            <span>
              Club <span className="font-normal text-ink-600">optional</span>
            </span>
            <TextInput defaultValue={coach.club ?? ""} name="club" type="text" />
          </Field>
        </div>

        <FieldGroup className="mt-1.5">
          Specialties
          <div className="mt-1.5 flex flex-wrap gap-2">
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
        </FieldGroup>

        <Field>
          <span>
            Bio <span className="font-normal text-ink-600">max 500</span>
          </span>
          <TextArea
            defaultValue={coach.bio ?? ""}
            maxLength={500}
            name="bio"
            placeholder="A short introduction."
            rows={3}
          />
        </Field>

        <Field>
          <span>
            Certifications <span className="font-normal text-ink-600">one per line</span>
          </span>
          <TextArea
            defaultValue={coach.certifications.join("\n")}
            name="certifications"
            placeholder="e.g. ECB Level 3"
            rows={3}
          />
        </Field>

        <div className="mt-1.5">
          <SubmitButton>Save changes</SubmitButton>
        </div>
      </Form>
    </section>
  );
}
