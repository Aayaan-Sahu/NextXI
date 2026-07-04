import { redirect } from "next/navigation";
import { Badge, PageHeader, PageShell, Panel } from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { getProfile, requireUser } from "@/lib/auth";
import { PLAYER_ROLE_LABELS } from "@/lib/players";
import { prisma } from "@/lib/prisma";
import { getReadyVideoGridItems } from "@/lib/videos.server";

export default async function GuardianDashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "guardian") redirect(`/dashboard/${profile.role}`);

  const child = await prisma.player.findFirst({
    where: { guardianId: user.id },
    select: {
      id: true,
      club: true,
      county: true,
      dateOfBirth: true,
      heightCm: true,
      name: true,
      roles: true,
      weightKg: true,
    },
  });

  if (!child) {
    return (
      <PageShell>
        <PageHeader subtitle={user.email} title={`Welcome ${profile.guardian.name}`} />
        <Panel title="No linked player">
          <p className="text-sm text-stone-600">
            Your account isn&apos;t linked to a player. If you believe this is a
            mistake, please contact support.
          </p>
        </Panel>
      </PageShell>
    );
  }

  const dateOfBirth = child.dateOfBirth.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  const facts = [
    ["Club", child.club],
    ["County", child.county],
    ["Date of birth", dateOfBirth],
    ["Height", child.heightCm ? `${child.heightCm} cm` : null],
    ["Weight", child.weightKg ? `${child.weightKg} kg` : null],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <PageShell>
      <PageHeader
        subtitle="You approved this account and can review everything your child shares."
        title={`${child.name}'s player account`}
      />
      <div className="grid gap-5">
        <Panel title="Profile">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-stone-600">{label}</dt>
                <dd className="mt-0.5 font-medium text-neutral-950">{value}</dd>
              </div>
            ))}
          </dl>
          {child.roles.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {child.roles.map((role) => (
                <Badge key={role}>{PLAYER_ROLE_LABELS[role]}</Badge>
              ))}
            </div>
          )}
        </Panel>
        <VideoGrid
          emptyMessage="No videos yet. Videos your child uploads will appear here."
          linkBase="/dashboard/guardian/videos"
          videos={await getReadyVideoGridItems(child.id)}
        />
      </div>
    </PageShell>
  );
}
