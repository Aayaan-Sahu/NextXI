import { COUNTRY_OPTIONS, DEFAULT_COUNTRY } from "@/lib/players";
import { Select } from "@/components/ui";

/**
 * Country picker used on onboarding and profile edit. Native select so mobile
 * pickers work; flag prefixes stay as option labels.
 */
export function CountrySelect({
  defaultValue = DEFAULT_COUNTRY,
  name,
}: {
  defaultValue?: string;
  name: string;
}) {
  return (
    <Select defaultValue={defaultValue} name={name} required>
      {COUNTRY_OPTIONS.map((country) => (
        <option key={country.label} value={country.label}>
          {country.flag} {country.label}
        </option>
      ))}
    </Select>
  );
}
