import Link from "next/link";
import { Kicker } from "@/components/ui";

export default function MessagesPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <Kicker>Thread</Kicker>
      <p className="font-display text-[28px] leading-[1.05] font-bold tracking-[.02em] uppercase text-ink-900">
        Pick a conversation
      </p>
      <p className="max-w-sm text-sm text-ink-600">
        Select someone from your inbox to keep the chat going — or{" "}
        <Link
          className="font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline"
          href="/dashboard/connections"
        >
          connect first
        </Link>{" "}
        if the list is empty.
      </p>
    </div>
  );
}
