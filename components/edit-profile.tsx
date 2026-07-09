import { updateProfile } from "@/app/dashboard/profile/actions";
import type { PlayerRole } from "@/app/generated/prisma/enums";
import { CheckboxChip, Field, FieldGroup, Form, Panel, PrimaryButton, TextArea, TextInput } from "@/components/ui";
import { PLAYER_ROLE_OPTIONS } from "@/lib/players";

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
    county: string;
    heightCm: number | null;
    name: string;
    roles: PlayerRole[];
    weightKg: number | null;
  };
  username: string | null;
}) {
  return (
    <Panel title="Player profile">
      <Form action={updateProfile}>
        <Field>
          Name
          <TextInput defaultValue={player.name} name="name" required type="text" />
        </Field>
        <UsernameField username={username} />
        <Field>
          Club
          <TextInput defaultValue={player.club} name="club" required type="text" />
        </Field>
        <Field>
          County
          <TextInput defaultValue={player.county} name="county" placeholder="e.g. Surrey" required type="text" />
        </Field>
        <Field>
          Height (cm)
          <TextInput
            defaultValue={player.heightCm ?? ""}
            max={300}
            min={1}
            name="heightCm"
            placeholder="Optional"
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
          <span className="text-xs font-normal text-stone-600">
            Optional. Select any that apply.
          </span>
        </FieldGroup>
        <PrimaryButton type="submit">Save changes</PrimaryButton>
      </Form>
    </Panel>
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
    <Panel title="Coach profile">
      <Form action={updateProfile}>
        <Field>
          Name
          <TextInput defaultValue={coach.name} name="name" required type="text" />
        </Field>
        <UsernameField username={username} />
        <Field>
          Accomplishments
          <TextArea
            defaultValue={coach.accomplishments.join("\n")}
            name="accomplishments"
            placeholder="One accomplishment per line"
            rows={8}
          />
        </Field>
        <PrimaryButton type="submit">Save changes</PrimaryButton>
      </Form>
    </Panel>
  );
}
