import { Field, FieldHint, TextInput } from "@/components/ui";

/**
 * Height (required) and weight (optional) side by side — height is the
 * calibration every measurement in a report depends on, so it never hides
 * inside a longer column.
 */
export function PhysicalFields({
  defaultHeight,
  defaultWeight,
}: {
  defaultHeight?: number | string;
  defaultWeight?: number | string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3.5">
      <Field>
        Height cm
        <TextInput
          autoComplete="off"
          defaultValue={defaultHeight ?? ""}
          inputMode="decimal"
          name="heightCm"
          placeholder="175"
          required
          type="text"
        />
        <FieldHint>Standing height.</FieldHint>
      </Field>
      <Field>
        Weight kg
        <TextInput
          autoComplete="off"
          defaultValue={defaultWeight ?? ""}
          inputMode="decimal"
          name="weightKg"
          placeholder="Optional"
          type="text"
        />
      </Field>
    </div>
  );
}
