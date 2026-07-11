import { redirect } from "next/navigation";
import { PlayerStatus } from "@/app/generated/prisma/enums";
import { createSession } from "@/app/dashboard/player/sessions/actions";
import { SessionList } from "@/components/session-list";
import { Field, PageHeader, PageShell, Panel, PrimaryButton, TextInput } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";
import { getPlayerSessions } from "@/lib/sessions.server";
import { VIDEO_DISCIPLINES } from "@/lib/videos";

const selectStyles =
  "rounded-md border border-cream-400 bg-cream-50 px-3 py-2.5 text-sm font-normal text-ink-900 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/25";

export default async function PlayerSessionsPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "player") redirect(`/dashboard/${profile.role}`);
  if (profile.player.status === PlayerStatus.PENDING_GUARDIAN) redirect("/dashboard/player");

  const sessions = await getPlayerSessions(user.id);

  return (
    <PageShell>
      <PageHeader
        subtitle="Group videos from one practice to track consistency across them."
        title="Practice sessions"
      />
      <div className="grid gap-9">
        <Panel title="New session">
          <form
            action={createSession}
            className="flex items-end gap-3 max-sm:flex-col max-sm:items-stretch"
          >
            <Field className="flex-1">
              Name
              <TextInput maxLength={120} name="name" placeholder="e.g. Tuesday nets" required />
            </Field>
            <Field className="flex-1">
              Discipline
              <select className={selectStyles} defaultValue="" name="category" required>
                <option disabled value="">
                  Select…
                </option>
                {Object.entries(VIDEO_DISCIPLINES).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <PrimaryButton type="submit">Create</PrimaryButton>
          </form>
        </Panel>
        <SessionList sessions={sessions} />
      </div>
    </PageShell>
  );
}
