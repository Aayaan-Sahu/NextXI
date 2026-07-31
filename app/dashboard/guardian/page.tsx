import { SubmitButton } from "@/components/submit-button";
import { redirect } from "next/navigation";
import { ConnectionStatus } from "@/app/generated/prisma/enums";
import { linkChild } from "@/app/dashboard/guardian/actions";
import { GuardianChildSwitcher } from "@/components/guardian-child-switcher";
import {
  Badge,
  EmptyState,
  Field,
  GatePanel,
  Kicker,
  Notice,
  PageShell,
  Panel,
  StatusBand,
  StatusBoard,
  TextInput,
  TextLink,
} from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { getProfile, requireUser } from "@/lib/auth";
import { getChildConnections, getGuardianChildren, selectChild } from "@/lib/guardian";
import type { ChildConnection } from "@/lib/guardian";
import { PLAYER_ROLE_LABELS } from "@/lib/players";
import { firstParam } from "@/lib/search-params";
import { getReadyVideoGridItems } from "@/lib/videos.server";

type SearchParams = Promise<{
  child?: string | string[];
  error?: string | string[];
  message?: string | string[];
}>;

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function connectionStatusLine(connection: ChildConnection) {
  const date = formatDate(connection.since);
  if (connection.status === ConnectionStatus.ACCEPTED) return `Connected · since ${date}`;
  if (connection.status === ConnectionStatus.PENDING) return `Pending · requested ${date}`;
  return `Revoked · ${date}`;
}

function LinkChildForm({ selectedChildId }: { selectedChildId?: string }) {
  return (
    <form action={linkChild} className="flex flex-wrap items-end gap-2.5">
      {selectedChildId ? <input name="child" type="hidden" value={selectedChildId} /> : null}
      <Field className="min-w-0 flex-1">
        Guardian code
        <TextInput name="childCode" placeholder="e.g. ABCD-2345" required type="text" />
      </Field>
      <SubmitButton>Link child</SubmitButton>
    </form>
  );
}

export default async function GuardianDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "guardian") redirect(`/dashboard/${profile.role}`);

  const params = await searchParams;
  const error = firstParam(params.error);
  const message = firstParam(params.message);

  const children = await getGuardianChildren(user.id);
  const child = selectChild(children, firstParam(params.child));

  if (!child) {
    return (
      <PageShell>
        <StatusBand className="mb-6">
          <GatePanel
            description={
              <p className="mb-4">
                Your account isn&apos;t linked to a player yet. Enter the code shown on
                your child&apos;s dashboard to link their account.
              </p>
            }
            kicker="GUARDIAN GATE"
            title={`Welcome ${profile.guardian.name}`}
          >
            <div className="mt-4 grid gap-4">
              <Notice tone="error">{error}</Notice>
              <LinkChildForm />
            </div>
          </GatePanel>
        </StatusBand>
      </PageShell>
    );
  }

  const [connections, videos] = await Promise.all([
    getChildConnections(user.id, child.id),
    getReadyVideoGridItems(child.id),
  ]);

  const facts = [
    ["Club", child.club],
    ["Country", child.country],
    ["Date of birth", formatDate(child.dateOfBirth)],
    ["Height", child.heightCm ? `${child.heightCm} cm` : null],
    ["Weight", child.weightKg ? `${child.weightKg} kg` : null],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  const stats = [
    `${videos.length} video${videos.length === 1 ? "" : "s"}`,
    `${connections?.length ?? 0} connection${(connections?.length ?? 0) === 1 ? "" : "s"}`,
  ];

  return (
    <PageShell>
      <div className="grid gap-6">
        <StatusBand>
          <StatusBoard
            actions={
              child.roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {child.roles.map((role) => (
                    <Badge key={role}>{PLAYER_ROLE_LABELS[role]}</Badge>
                  ))}
                </div>
              ) : undefined
            }
            kicker="GUARDIAN HOME"
            stats={stats}
            title={child.name}
          />
        </StatusBand>
        <GuardianChildSwitcher
          basePath="/dashboard/guardian"
          players={children}
          selectedId={child.id}
        />
        <Notice tone="error">{error}</Notice>
        <Notice>{message}</Notice>
        <Panel>
          <Kicker>Profile</Kicker>
          <dl className="mt-[18px] grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] font-bold tracking-[.1em] text-ink-600 uppercase">
                  {label}
                </dt>
                <dd className="mt-[5px] text-[14.5px] font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Kicker>Connections</Kicker>
            <TextLink href={`/dashboard/guardian/messages?child=${child.id}`}>
              View messages
            </TextLink>
          </div>
          {connections?.length ? (
            <ul className="mt-[18px] grid gap-3">
              {connections.map((connection) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
                  key={connection.connectionId}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {connection.name}
                      {connection.username ? (
                        <span className="font-mono text-xs font-medium text-ink-600">
                          {" "}
                          @{connection.username}
                        </span>
                      ) : null}
                    </p>
                    {connection.role ? (
                      <p className="mt-0.5 text-xs text-ink-600 capitalize">
                        {connection.role}
                      </p>
                    ) : null}
                  </div>
                  <p className="font-mono text-[11px] text-ink-600">
                    {connectionStatusLine(connection)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState>
                No connections yet. Requests your child sends or receives will appear here.
              </EmptyState>
            </div>
          )}
        </Panel>
        <div className="grid gap-3">
          <Kicker>Library</Kicker>
          <VideoGrid
            emptyMedia
            emptyMessage="No videos yet. Videos your child uploads will appear here."
            linkBase="/dashboard/guardian/videos"
            videos={videos}
          />
        </div>
        <Panel title="Link another child">
          <p className="mb-4 text-sm text-ink-600">
            Enter the code shown on your child&apos;s dashboard to link their account.
          </p>
          <LinkChildForm selectedChildId={child.id} />
        </Panel>
      </div>
    </PageShell>
  );
}
