import { updateProfile } from "@/app/dashboard/profile/actions";
import { Field, Form, Panel, PrimaryButton, TextArea, TextInput } from "@/components/ui";

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
    heightCm: number | null;
    name: string;
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
          Country
          <TextInput defaultValue={player.country} name="country" required type="text" />
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
