export type AuthStep = "account" | "confirm" | "profile";

const STEPS: { id: AuthStep; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "confirm", label: "Confirm" },
  { id: "profile", label: "Profile" },
];

/** Three-beat progress for signup: Account → Confirm → Profile. */
export function AuthStepper({ current }: { current: AuthStep }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <ol className="mb-6 flex items-center gap-0 font-mono text-[10px] font-semibold tracking-[.16em] uppercase sm:text-[11px]">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;

        return (
          <li className="flex min-w-0 flex-1 items-center" key={step.id}>
            {index > 0 && (
              <span
                aria-hidden
                className={`mx-1.5 h-px flex-1 ${done || active ? "bg-gold-500" : "bg-cream-400"}`}
              />
            )}
            <span
              className={
                active
                  ? "text-rust-600"
                  : done
                    ? "text-ink-900"
                    : "text-ink-600"
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
