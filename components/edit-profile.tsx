import type { ReactNode } from "react";
import { updateProfile } from "@/app/dashboard/profile/actions";
import type { PlayerRole } from "@/app/generated/prisma/enums";
import { CountrySelect } from "@/components/country-select";
import { CheckboxChip, Field, FieldGroup, Form, Kicker, PrimaryButton, TextArea, TextInput } from "@/components/ui";
import { PLAYER_ROLE_OPTIONS } from "@/lib/players";

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
  player,
  username,
}: {
  player: {
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
        <div className="mt-1.5">
          <PrimaryButton type="submit">Save changes</PrimaryButton>
        </div>
      </Form>
    </ProfileCard>
  );
}

export function EditCoachProfilePanel({
  coach,
  username,
}: {
  coach: {
    accomplishments: string[];
    name: string;
  };
  username: string | null;
}) {
  return (
    <ProfileCard kicker="Coach profile">
      <Form action={updateProfile}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            Name
            <TextInput defaultValue={coach.name} name="name" required type="text" />
          </Field>
          <UsernameField username={username} />
        </div>
        <Field>
          Accomplishments
          <TextArea
            defaultValue={coach.accomplishments.join("\n")}
            name="accomplishments"
            placeholder="One accomplishment per line"
            rows={8}
          />
        </Field>
        <div className="mt-1.5">
          <PrimaryButton type="submit">Save changes</PrimaryButton>
        </div>
      </Form>
    </ProfileCard>
  );
}
