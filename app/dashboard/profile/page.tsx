import { redirect } from "next/navigation";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import { AvatarField } from "@/components/avatar-upload";
import { DeleteAccountPanel } from "@/components/delete-account";
import {
  EditCoachProfilePanel,
  EditPlayerProfilePanel,
  PROFILE_FORM_ID,
  VisibilityRow,
} from "@/components/edit-profile";
import { SetPasswordPanel } from "@/components/set-password";
import { Notice, PageShell, SectionHeading, PageTitle } from "@/components/ui";
import { getAvatarUrl } from "@/lib/avatars.server";
import { getProfile, isAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  error?: string | string[];
  message?: string | string[];
}>;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();

  if (isAdmin(user)) redirect("/dashboard/admin");

  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role === "guardian") redirect("/dashboard/guardian");
  // A club's details are set at onboarding; there is no club profile form yet.
  if (profile.role === "club") redirect("/dashboard/club");

  const params = await searchParams;
  const error = firstParam(params.error);
  const message = firstParam(params.message);
  // Both are network round trips — signing the avatar URL and reading the
  // linked guardian go out together rather than one after the other.
  const [avatarUrl, guardianRow] = await Promise.all([
    getAvatarUrl(
      profile.role === "player" ? profile.player.avatarPath : profile.coach.avatarPath,
    ),
    profile.role === "player"
      ? prisma.player.findUnique({
          where: { id: user.id },
          select: { guardian: { select: { name: true } } },
        })
      : Promise.resolve(null),
  ]);
  const guardianName = guardianRow?.guardian?.name ?? null;

  // The h1 names the page, not the person: a heading of "Aarav Sharma" leaves
  // a screen-reader user with nothing identifying where they've landed. The
  // identity facts sit on the quiet line beneath it.
  const displayName =
    profile.role === "player" ? profile.player.name : profile.coach.name;
  const identity = [
    displayName,
    profile.username ? `@${profile.username}` : "No username",
    profile.role === "player" ? "Player" : "Coach",
    user.email ?? "No email",
  ].join(" · ");

  return (
    <PageShell>
      <div className="max-w-[1060px]">
        <DashboardReveal>
          <DashboardRevealItem index={0}>
            <div className="grid gap-2.5 empty:hidden">
              <Notice tone="error">{error}</Notice>
              <Notice>{message}</Notice>
            </div>
            <PageTitle className="mt-5">Edit profile</PageTitle>
            <p className="mt-1.5 text-ui text-ink-600">{identity}</p>
          </DashboardRevealItem>

          {profile.role === "player" ? (
            <DashboardRevealItem className="mt-7" index={1}>
              <VisibilityRow visibility={profile.player.visibility} />
            </DashboardRevealItem>
          ) : null}

          <DashboardRevealItem
            className="mt-7 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px]"
            index={2}
          >
            {profile.role === "player" ? (
              <EditPlayerProfilePanel player={profile.player} username={profile.username} />
            ) : (
              <EditCoachProfilePanel coach={profile.coach} username={profile.username} />
            )}

            <div className="grid gap-8">
              <section>
                <SectionHeading>Photo</SectionHeading>
                <div className="mt-4">
                  <AvatarField
                    avatarPath={
                      profile.role === "player"
                        ? profile.player.avatarPath
                        : profile.coach.avatarPath
                    }
                    avatarUrl={avatarUrl}
                    form={PROFILE_FORM_ID}
                    initial={displayName.charAt(0).toUpperCase()}
                  />
                </div>
              </section>

              <SetPasswordPanel />

              {profile.role === "player" ? (
                <section>
                  <SectionHeading>Guardian</SectionHeading>
                  <p className="mt-2 text-ui leading-relaxed text-ink-800">
                    {guardianName
                      ? `Guardian linked: ${guardianName}.`
                      : "No guardian linked to this account."}
                  </p>
                </section>
              ) : null}

              <DeleteAccountPanel />
            </div>
          </DashboardRevealItem>
        </DashboardReveal>
      </div>
    </PageShell>
  );
}
