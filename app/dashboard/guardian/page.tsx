import { SubmitButton } from "@/components/submit-button";
import { redirect } from "next/navigation";
import { ConnectionStatus } from "@/app/generated/prisma/enums";
import { linkChild } from "@/app/dashboard/guardian/actions";
import { PersonAvatar } from "@/components/connections";
import { GuardianChildSwitcher } from "@/components/guardian-child-switcher";
import {
  Chip,
  EmptyState,
  Field,
  FieldHint,
  GatePanel,
  Notice,
  PageShell,
  SectionHead,
  SectionHeading,
  TextInput,
  TextLink, PageTitle } from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { getProfile, requireUser } from "@/lib/auth";
import { getChildConnections, getGuardianChildren, selectChild } from "@/lib/guardian";
import type { ChildConnection } from "@/lib/guardian";
import { countryWithFlag, PLAYER_ROLE_LABELS } from "@/lib/players";
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

function LinkChildForm({
  compact = false,
  selectedChildId,
}: {
  compact?: boolean;
  selectedChildId?: string;
}) {
  const code = (
    <TextInput
      aria-label="Approval code"
      className="min-w-0 flex-1 font-semibold tracking-[.14em]"
      name="childCode"
      placeholder="e.g. ABCD-2345"
      required
      type="text"
    />
  );

  if (compact) {
    return (
      <form action={linkChild} className="flex gap-2.5">
        {selectedChildId ? <input name="child" type="hidden" value={selectedChildId} /> : null}
        {code}
        <SubmitButton className="shrink-0 !px-[18px] !py-2.5 !text-ui" variant="secondary">
          Link
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={linkChild}>
      <Field>
        Approval code
        {code}
        <FieldHint>Shown on your child&apos;s dashboard after they sign up.</FieldHint>
      </Field>
      <SubmitButton className="mt-4 w-full">Link my child</SubmitButton>
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
      <main className="mx-auto w-full max-w-[1360px] px-6 pt-14 pb-18 sm:px-10" id="main-content">
        <GatePanel
          description="This account isn't linked to a player yet. Enter the approval code from your child's dashboard and their account opens straight away."
          title={`Welcome, ${profile.guardian.name.split(" ")[0] || profile.guardian.name}`}
        >
          <Notice className="mt-6" tone="error">
            {error}
          </Notice>
          <div className="mt-6 rounded-[10px] border border-cream-400 bg-cream-50 px-6 py-5">
            <LinkChildForm />
          </div>
        </GatePanel>
      </main>
    );
  }

  const [connections, videos] = await Promise.all([
    getChildConnections(user.id, child.id),
    getReadyVideoGridItems(child.id),
  ]);

  const facts = [
    ["Club", child.club],
    ["Country", countryWithFlag(child.country)],
    ["Date of birth", formatDate(child.dateOfBirth)],
    ["Height", child.heightCm ? `${child.heightCm} cm` : null],
    ["Weight", child.weightKg ? `${child.weightKg} kg` : null],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  const stats = [
    `${videos.length} video${videos.length === 1 ? "" : "s"}`,
    `${connections?.length ?? 0} connection${(connections?.length ?? 0) === 1 ? "" : "s"}`,
  ];

  const firstName = child.name.split(" ")[0] || child.name;

  return (
    <PageShell>
      <div>
        <GuardianChildSwitcher
          basePath="/dashboard/guardian"
          players={children}
          selectedId={child.id}
        />
      </div>

      <header className="mt-5 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <PageTitle>{child.name}</PageTitle>
          <p className="mt-1.5 text-ui text-ink-600">
            {stats.join(" · ")} · you have read-only oversight
          </p>
        </div>
        {child.roles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {child.roles.map((role) => (
              <Chip key={role}>{PLAYER_ROLE_LABELS[role]}</Chip>
            ))}
          </div>
        ) : null}
      </header>

      <div className="mt-4 grid gap-2.5 empty:hidden">
        <Notice tone="error">{error}</Notice>
        <Notice>{message}</Notice>
      </div>

      <div className="mt-7 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-9">
          <section>
            <SectionHeading>Profile</SectionHeading>
            <dl className="mt-3.5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="text-body font-semibold">{value}</dd>
                  <p aria-hidden className="mt-1 text-caption text-ink-600">
                    {label}
                  </p>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <SectionHeading>Library</SectionHeading>
            <div className="mt-4">
              <VideoGrid
                emptyMessage="No videos yet. Videos your child uploads will appear here."
                linkBase="/dashboard/guardian/videos"
                videos={videos}
              />
            </div>
            <p className="mt-3.5 text-caption text-ink-600">
              Videos filed into practice sessions aren&apos;t shown here yet.
            </p>
          </section>
        </div>

        <div className="grid gap-9">
          <section>
            <SectionHead
              aside={
                <TextLink
                  className="text-caption"
                  href={`/dashboard/guardian/messages?child=${child.id}`}
                >
                  View messages →
                </TextLink>
              }
            >
              Connections
            </SectionHead>
            {connections?.length ? (
              <>
                <ul className="mt-3.5 border-b border-cream-400">
                  {connections.map((connection) => (
                    <li
                      className="flex items-center gap-3 border-t border-cream-400 py-3"
                      key={connection.connectionId}
                    >
                      <PersonAvatar
                        name={connection.name}
                        role={connection.role}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-ui font-semibold">
                          {connection.name}
                          {connection.username ? (
                            <span className="font-normal text-ink-600"> @{connection.username}</span>
                          ) : null}
                        </p>
                        <p
                          className={`mt-0.5 truncate text-caption first-letter:uppercase ${
                            connection.status === ConnectionStatus.PENDING
                              ? "font-semibold text-rust-600"
                              : "text-ink-600"
                          }`}
                        >
                          {connection.role ? `${connection.role} · ` : ""}
                          {connectionStatusLine(connection)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-caption leading-relaxed text-ink-600">
                  Pending and revoked entries stay listed so you can see everyone who has asked to
                  reach {firstName}.
                </p>
              </>
            ) : (
              <div className="mt-3.5">
                <EmptyState>
                  No connections yet. Requests your child sends or receives will appear here.
                </EmptyState>
              </div>
            )}
          </section>

          <section>
            <SectionHeading>Link another child</SectionHeading>
            <div className="mt-3">
              <LinkChildForm compact selectedChildId={child.id} />
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
