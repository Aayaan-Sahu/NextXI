import { Field, Kicker, TextInput } from "@/components/ui";

/** Height (required) and weight (optional), stacked so number spinners never dominate. */
export function PhysicalFields({
  defaultHeight,
  defaultWeight,
}: {
  defaultHeight?: number | string;
  defaultWeight?: number | string | null;
}) {
  return (
    <div className="grid gap-4">
      <Kicker>Physical</Kicker>
      <Field>
        Height
        <TextInput
          autoComplete="off"
          defaultValue={defaultHeight ?? ""}
          inputMode="decimal"
          name="heightCm"
          placeholder="175"
          required
          type="text"
        />
        <span className="text-xs font-normal text-ink-600">
          Standing height in centimetres — for example 175.
        </span>
      </Field>
      <Field>
        Weight
        <TextInput
          autoComplete="off"
          defaultValue={defaultWeight ?? ""}
          inputMode="decimal"
          name="weightKg"
          placeholder="Optional"
          type="text"
        />
        <span className="text-xs font-normal text-ink-600">
          Optional. Kilograms — for example 72.
        </span>
      </Field>
    </div>
  );
}
