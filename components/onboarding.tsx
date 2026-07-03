import { completeOnboarding } from "@/app/auth/actions";
import { Field, Form, Panel, PrimaryButton, TextArea, TextInput } from "@/components/ui";

export function PlayerOnboardingPanel() {
  return (
    <Panel title="Player">
      <Form action={completeOnboarding}>
        <input name="role" type="hidden" value="player" />
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
        <Field>
          Height (cm)
          <TextInput max={300} min={1} name="heightCm" placeholder="Optional" type="number" />
        </Field>
        <Field>
          Weight (kg)
          <TextInput max={500} min={1} name="weightKg" placeholder="Optional" type="number" />
        </Field>
        <PrimaryButton type="submit">Create player profile</PrimaryButton>
      </Form>
    </Panel>
  );
}

export function CoachOnboardingPanel() {
  return (
    <Panel title="Coach">
      <Form action={completeOnboarding}>
        <input name="role" type="hidden" value="coach" />
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
        <Field>
          Accomplishments
          <TextArea
            name="accomplishments"
            placeholder="One accomplishment per line"
            rows={8}
          />
        </Field>
        <PrimaryButton type="submit">Create coach profile</PrimaryButton>
      </Form>
    </Panel>
  );
}
