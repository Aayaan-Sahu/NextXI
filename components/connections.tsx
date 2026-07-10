"use client";

import { useState } from "react";
import {
  respondToConnectionRequest,
  revokeConnection,
  sendConnectionRequest,
} from "@/app/dashboard/connections/actions";
import type { ConnectionPanelData, ConnectionPerson } from "@/lib/connections";
import { Kicker, Panel, PrimaryButton, SecondaryButton, TextInput } from "@/components/ui";

const smallGoldButton =
  "cursor-pointer rounded-md bg-gold-500 px-3.5 py-[7px] text-[12.5px] font-bold text-pitch-900 hover:bg-gold-600";
const smallOutlineButton =
  "cursor-pointer rounded-md border border-cream-500 bg-transparent px-3.5 py-[7px] text-[12.5px] font-semibold text-ink-900 hover:bg-cream-200";

function Username({ username }: { username: string | null }) {
  if (!username) return null;
  return <span className="font-mono text-xs font-medium text-ink-600"> @{username}</span>;
}

function Empty({ children }: { children: string }) {
  return <p className="mt-3 text-sm text-ink-600">{children}</p>;
}

function PendingList({ people }: { people: ConnectionPerson[] }) {
  if (!people.length) return <Empty>None.</Empty>;

  return (
    <ul className="mt-3 grid gap-2.5">
      {people.map((person) => (
        <li className="text-sm font-semibold" key={person.connectionId}>
          {person.name}
          <Username username={person.username} />{" "}
          <span className="text-xs font-normal text-sage-400">· Pending</span>
        </li>
      ))}
    </ul>
  );
}

function IncomingList({ people }: { people: ConnectionPerson[] }) {
  if (!people.length) return <Empty>None.</Empty>;

  return (
    <ul className="mt-3 grid gap-3">
      {people.map((person) => (
        <li
          className="flex items-center justify-between gap-3"
          key={person.connectionId}
        >
          <div className="min-w-0">
            <p className="text-sm font-bold">
              {person.name}
              <Username username={person.username} />
            </p>
            {person.role ? (
              <p className="mt-0.5 text-xs text-ink-600 capitalize">{person.role}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <form action={respondToConnectionRequest}>
              <input name="connectionId" type="hidden" value={person.connectionId} />
              <input name="response" type="hidden" value="accept" />
              <button className={smallGoldButton} type="submit">
                Accept
              </button>
            </form>
            <form action={respondToConnectionRequest}>
              <input name="connectionId" type="hidden" value={person.connectionId} />
              <input name="response" type="hidden" value="decline" />
              <button className={smallOutlineButton} type="submit">
                Decline
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Confirm dialog + form that revokes an accepted connection. */
function RevokeButton({ person }: { person: ConnectionPerson }) {
  const [confirming, setConfirming] = useState(false);

  const warning =
    person.role === "coach"
      ? "This coach will lose access to your videos."
      : "You will lose access to this person's videos and messages.";

  return (
    <>
      <button
        className="cursor-pointer rounded-md border border-cream-500 bg-transparent px-3.5 py-[7px] text-[12.5px] font-semibold text-rust-600 hover:bg-cream-200"
        onClick={() => setConfirming(true)}
        type="button"
      >
        Revoke
      </button>
      {confirming ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-950/60 p-4"
          role="alertdialog"
        >
          <div className="w-full max-w-[380px] rounded-[10px] border border-cream-400 bg-cream-100 p-5 shadow-2xl shadow-black/40">
            <p className="font-semibold">Revoke this connection?</p>
            <p className="mt-2 text-sm text-ink-600">{warning}</p>
            <div className="mt-4 flex justify-end gap-2">
              <SecondaryButton onClick={() => setConfirming(false)} type="button">
                Cancel
              </SecondaryButton>
              <form action={revokeConnection}>
                <input name="connectionId" type="hidden" value={person.connectionId} />
                <PrimaryButton type="submit">Revoke</PrimaryButton>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AcceptedList({ people }: { people: ConnectionPerson[] }) {
  if (!people.length) return <Empty>None.</Empty>;

  return (
    <ul className="mt-3 grid gap-3">
      {people.map((person) => (
        <li
          className="flex items-center justify-between gap-3"
          key={person.connectionId}
        >
          <p className="text-sm font-semibold">
            {person.name}
            <Username username={person.username} />
          </p>
          <RevokeButton person={person} />
        </li>
      ))}
    </ul>
  );
}

export function ConnectionsPanel({ data }: { data: ConnectionPanelData }) {
  return (
    <div className="grid content-start gap-5">
      <Panel title="Send a request">
        <form action={sendConnectionRequest} className="flex gap-2.5">
          <div className="grid min-w-0 flex-1">
            <TextInput
              aria-label="Username"
              name="username"
              pattern="[A-Za-z0-9_]{3,30}"
              placeholder="Username"
              required
              title="Use 3-30 letters, numbers, or underscores."
              type="text"
            />
          </div>
          <button
            className="shrink-0 cursor-pointer rounded-md bg-gold-500 px-4 py-2 text-[13px] font-bold whitespace-nowrap text-pitch-900 hover:bg-gold-600"
            type="submit"
          >
            Send request
          </button>
        </form>
      </Panel>

      <Panel>
        <section>
          <Kicker>Incoming requests</Kicker>
          <IncomingList people={data.incomingPending} />
        </section>

        <section className="mt-4 border-t border-cream-400 pt-4">
          <Kicker>Outgoing requests</Kicker>
          <PendingList people={data.outgoingPending} />
        </section>

        <section className="mt-4 border-t border-cream-400 pt-4">
          <Kicker>Connected</Kicker>
          <AcceptedList people={data.accepted} />
        </section>
      </Panel>
    </div>
  );
}
