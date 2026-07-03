import { Panel } from "@/components/ui";

type Profile =
  | {
      player: {
        club: string;
        country: string;
        heightCm: number | null;
        name: string;
        visibility: string;
        weightKg: number | null;
      };
      role: "player";
      username: string | null;
    }
  | {
      coach: {
        accomplishments: string[];
        name: string;
      };
      role: "coach";
      username: string | null;
    };

export function ProfilePanel({ profile }: { profile: Profile }) {
  return (
    <Panel title={profile.role === "player" ? "Player profile" : "Coach profile"}>
      {profile.role === "player" ? (
        <dl className="grid gap-4">
          <div className="grid gap-1 border-t border-stone-300 pt-3 dark:border-neutral-700">
            <dt className="text-[13px] text-stone-600 dark:text-neutral-300">Name</dt>
            <dd className="m-0">{profile.player.name}</dd>
          </div>
          <div className="grid gap-1 border-t border-stone-300 pt-3 dark:border-neutral-700">
            <dt className="text-[13px] text-stone-600 dark:text-neutral-300">Username</dt>
            <dd className="m-0">{profile.username ? `@${profile.username}` : "Not set"}</dd>
          </div>
          <div className="grid gap-1 border-t border-stone-300 pt-3 dark:border-neutral-700">
            <dt className="text-[13px] text-stone-600 dark:text-neutral-300">Club</dt>
            <dd className="m-0">{profile.player.club}</dd>
          </div>
          <div className="grid gap-1 border-t border-stone-300 pt-3 dark:border-neutral-700">
            <dt className="text-[13px] text-stone-600 dark:text-neutral-300">Country</dt>
            <dd className="m-0">{profile.player.country}</dd>
          </div>
          <div className="grid gap-1 border-t border-stone-300 pt-3 dark:border-neutral-700">
            <dt className="text-[13px] text-stone-600 dark:text-neutral-300">Height</dt>
            <dd className="m-0">
              {profile.player.heightCm ? `${profile.player.heightCm} cm` : "Not set"}
            </dd>
          </div>
          <div className="grid gap-1 border-t border-stone-300 pt-3 dark:border-neutral-700">
            <dt className="text-[13px] text-stone-600 dark:text-neutral-300">Weight</dt>
            <dd className="m-0">
              {profile.player.weightKg ? `${profile.player.weightKg} kg` : "Not set"}
            </dd>
          </div>
          <div className="grid gap-1 border-t border-stone-300 pt-3 dark:border-neutral-700">
            <dt className="text-[13px] text-stone-600 dark:text-neutral-300">Visibility</dt>
            <dd className="m-0">{profile.player.visibility.toLowerCase()}</dd>
          </div>
        </dl>
      ) : (
        <div className="grid gap-3">
          <dl className="grid gap-4">
            <div className="grid gap-1 border-t border-stone-300 pt-3 dark:border-neutral-700">
              <dt className="text-[13px] text-stone-600 dark:text-neutral-300">Name</dt>
              <dd className="m-0">{profile.coach.name}</dd>
            </div>
            <div className="grid gap-1 border-t border-stone-300 pt-3 dark:border-neutral-700">
              <dt className="text-[13px] text-stone-600 dark:text-neutral-300">Username</dt>
              <dd className="m-0">{profile.username ? `@${profile.username}` : "Not set"}</dd>
            </div>
          </dl>
          {profile.coach.accomplishments.length ? (
            <ul className="m-0 pl-[18px]">
              {profile.coach.accomplishments.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-stone-600 dark:text-neutral-300">
              No accomplishments added.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
