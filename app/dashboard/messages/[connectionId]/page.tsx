import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageThread } from "@/components/messaging";
import { Notice, PageHeader, PageShell, SignOutButton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getThread, markConversationRead } from "@/lib/messages";
import { firstParam } from "@/lib/search-params";

type Params = Promise<{ connectionId: string }>;
type SearchParams = Promise<{ error?: string | string[] }>;

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const { connectionId } = await params;

  const thread = await getThread(user.id, connectionId);
  if (!thread) redirect("/dashboard/messages");

  await markConversationRead(user.id, connectionId);

  const error = firstParam((await searchParams).error);
  const subtitle = [
    thread.counterpart.username ? `@${thread.counterpart.username}` : null,
    thread.counterpart.role,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageShell>
      <PageHeader
        action={<SignOutButton />}
        subtitle={subtitle || undefined}
        title={thread.counterpart.name}
      />
      <Link
        className="mb-4 inline-block text-sm text-neutral-950 underline-offset-2 hover:underline dark:text-neutral-50"
        href="/dashboard/messages"
      >
        ← All conversations
      </Link>
      <Notice tone="error">{error}</Notice>
      <MessageThread connectionId={connectionId} messages={thread.messages} />
    </PageShell>
  );
}
