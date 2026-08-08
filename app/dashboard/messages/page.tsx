import { Kicker, TextLink } from "@/components/ui";

/**
 * The md+ resting pane beside the inbox list. Only ever painted at md+
 * (MessagesShell gives it `hidden md:flex`), where the sidebar's "Inbox" is
 * the h1 — so this titles itself with an h2 to match its visual rank.
 */
export default function MessagesPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <Kicker>Conversations</Kicker>
      <h2 className="font-display text-[28px] leading-[1.05] font-bold tracking-[.02em] uppercase text-ink-900">
        Pick a conversation
      </h2>
      <p className="max-w-sm text-sm text-ink-600">
        Choose someone from your inbox to open the thread — or{" "}
        <TextLink href="/dashboard/connections">connect first</TextLink> if the
        list is empty.
      </p>
    </div>
  );
}
