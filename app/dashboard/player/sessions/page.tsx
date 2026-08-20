import { SubmitButton } from "@/components/submit-button";
import { redirect } from "next/navigation";
import { PlayerStatus } from "@/app/generated/prisma/enums";
import { createSession } from "@/app/dashboard/player/sessions/actions";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import { SessionList } from "@/components/session-list";
import { PageHeader, PageShell, SectionHeading, Select, TextInput } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";
import { getPlayerSessions } from "@/lib/sessions.server";
import { VIDEO_DISCIPLINES } from "@/lib/videos";

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
      <div className="max-w-[1040px]">
        <DashboardReveal className="grid gap-6">
          <DashboardRevealItem index={0}>
            <PageHeader
              subtitle={stats.join(" · ")}
              title="Sessions"
            />
          </DashboardRevealItem>

          <DashboardRevealItem index={1}>
            <form
              action={createSession}
              className="flex items-center gap-3 max-sm:flex-col max-sm:items-stretch"
            >
              <TextInput
                aria-label="Session name"
                className="flex-1"
                maxLength={120}
                name="name"
                placeholder="Session name — e.g. Tuesday nets"
                required
              />
              <Select
                aria-label="Discipline"
                className="sm:w-[220px]"
                defaultValue=""
                name="category"
                required
              >
                <option disabled value="">
                  Discipline
                </option>
                {Object.entries(VIDEO_DISCIPLINES).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
              <SubmitButton>Create</SubmitButton>
            </form>
          </DashboardRevealItem>

          <DashboardRevealItem className="mt-4" index={2}>
            <SectionHeading>Filed sessions</SectionHeading>
            <div className="mt-3">
              <SessionList sessions={sessions} />
            </div>
          </DashboardRevealItem>
        </DashboardReveal>
      </div>
    </PageShell>
  );
}
