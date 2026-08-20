export type AuthStep = "account" | "confirm" | "profile";

const STEPS: { id: AuthStep; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "confirm", label: "Confirm" },
  { id: "profile", label: "Profile" },
];

/**
 * Three-beat progress for signup: Account → Confirm → Profile.
 * `tone="dark"` is the variant that rides the maroon header bar.
 */
export function AuthStepper({
  current,
  tone = "light",
}: {
  current: AuthStep;
  tone?: "light" | "dark";
}) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);
  const dark = tone === "dark";

  return (
    <ol
      className={`flex items-center gap-2.5 ${
        dark ? "text-micro text-cream-200/60" : "mb-5 text-caption text-ink-600"
      }`}
    >
      {STEPS.map((step, index) => {
        const active = index === currentIndex;

        return (
          <li className="flex items-center gap-2.5" key={step.id}>
            {index > 0 && (
              <span
                aria-hidden
                className={`h-px w-[18px] ${dark ? "bg-cream-200/35" : "bg-cream-500"}`}
              />
            )}
            <span
              className={
                active
                  ? dark
                    ? "font-semibold text-cream-50"
                    : "font-semibold text-ink-900"
                  : undefined
              }
            >
              <span className="tabular-nums">{index + 1}</span>
              <span className="ml-1.5 max-sm:hidden">{step.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
