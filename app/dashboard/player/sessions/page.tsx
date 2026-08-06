import { SubmitButton } from "@/components/submit-button";
import { redirect } from "next/navigation";
import { PlayerStatus } from "@/app/generated/prisma/enums";
import { createSession } from "@/app/dashboard/player/sessions/actions";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import { SessionList } from "@/components/session-list";
import {
  Field,
  Kicker,
  PageShell,
  Panel,
  Select,
  StatusBand,
  StatusBoard,
  TextInput,
} from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";
import { getPlayerSessions } from "@/lib/sessions.server";
import { VIDEO_DISCIPLINES } from "@/lib/videos";

function sessionsNote(count: number) {
  if (count === 0) {
    return "Start a session, drop in a few clips, and watch consistency across the set.";
  }
  return "Group videos from one practice so technique trends have a clean reading.";
}

export default async function PlayerSessionsPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "player") redirect(`/dashboard/${profile.role}`);
  if (profile.player.status === PlayerStatus.PENDING_GUARDIAN) redirect("/dashboard/player");

  const sessions = await getPlayerSessions(user.id);
  const clipCount = sessions.reduce((sum, session) => sum + session.videoCount, 0);
  const stats = [
    `${sessions.length} session${sessions.length === 1 ? "" : "s"}`,
    `${clipCount} clip${clipCount === 1 ? "" : "s"} filed`,
  ];

  return (
    <PageShell>
      <DashboardReveal className="grid gap-9">
        <DashboardRevealItem index={0}>
          <StatusBand>
            <StatusBoard
              kicker="SESSIONS"
              note={sessionsNote(sessions.length)}
              stats={stats}
              title="Practice sessions."
            />
          </StatusBand>
        </DashboardRevealItem>

        <DashboardRevealItem index={1}>
          <Panel>
            <Kicker>New session</Kicker>
            <form
              action={createSession}
              className="mt-4 flex items-end gap-3 max-sm:flex-col max-sm:items-stretch"
            >
              <Field className="flex-1">
                Name
                <TextInput maxLength={120} name="name" placeholder="e.g. Tuesday nets" required />
              </Field>
              <Field className="flex-1">
                Discipline
                <Select defaultValue="" name="category" required>
                  <option disabled value="">
                    Select…
                  </option>
                  {Object.entries(VIDEO_DISCIPLINES).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <SubmitButton>Create</SubmitButton>
            </form>
          </Panel>
        </DashboardRevealItem>

        <DashboardRevealItem index={2}>
          <SessionList sessions={sessions} />
        </DashboardRevealItem>
      </DashboardReveal>
    </PageShell>
  );
}
