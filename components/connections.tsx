"use client";

import { SubmitButton } from "@/components/submit-button";
import { useState } from "react";
import {
  respondToConnectionRequest,
  revokeConnection,
  sendConnectionRequest,
} from "@/app/dashboard/connections/actions";
import type { ConnectionPanelData, ConnectionPerson } from "@/lib/connections";
import {
  EmptyState,
  Kicker,
  Panel,
  SecondaryButton,
  TextInput,
} from "@/components/ui";

const smallGoldButton =
  "cursor-pointer rounded-md bg-gold-500 px-3.5 py-[7px] text-[12.5px] font-bold text-pitch-900 hover:bg-gold-600";
const smallOutlineButton =
  "cursor-pointer rounded-md border border-cream-500 bg-transparent px-3.5 py-[7px] text-[12.5px] font-semibold text-ink-900 hover:bg-cream-200";

function Username({ username }: { username: string | null }) {
  if (!username) return null;
  return <span className="font-mono text-xs font-medium text-ink-600"> @{username}</span>;
}

function PersonAvatar({ name, active = false }: { name: string; active?: boolean }) {
  return (
    <span
      className={`flex size-[38px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${
        active ? "bg-pitch-900 text-gold-500" : "bg-pitch-800 text-cream-200"
      }`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function PersonMeta({
  name,
  username,
  detail,
}: {
  name: string;
  username: string | null;
  detail?: string | null;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-bold text-ink-900">
        {name}
        <Username username={username} />
      </p>
      {detail ? (
        <p className="mt-0.5 truncate font-mono text-[11.5px] text-ink-600 capitalize">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function PendingList({ people }: { people: ConnectionPerson[] }) {
  if (!people.length) {
    return (
      <p className="mt-3 text-sm text-ink-600">No outgoing requests right now.</p>
    );
  }

  return (
    <ul className="mt-3 grid gap-2.5">
      {people.map((person) => (
        <li
          className="flex items-center gap-3 rounded-md border border-cream-400 bg-cream-50/60 px-3 py-2.5"
          key={person.connectionId}
        >
          <PersonAvatar name={person.name} />
          <PersonMeta
            detail="Pending"
            name={person.name}
            username={person.username}
          />
        </li>
      ))}
    </ul>
  );
}

function IncomingList({ people }: { people: ConnectionPerson[] }) {
  if (!people.length) {
    return (
      <p className="mt-3 text-sm text-ink-600">No incoming requests right now.</p>
    );
  }

  return (
    <ul className="mt-3 grid gap-2.5">
      {people.map((person) => (
        <li
          className="flex items-center justify-between gap-3 rounded-md border border-cream-400 bg-cream-50/60 px-3 py-2.5"
          key={person.connectionId}
        >
          <div className="flex min-w-0 items-center gap-3">
            <PersonAvatar active name={person.name} />
            <PersonMeta
              detail={person.role}
              name={person.name}
              username={person.username}
            />
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
          <div className="w-full max-w-[380px] rounded-[10px] border border-cream-400 bg-white p-5 shadow-2xl shadow-black/40">
            <p className="font-semibold">Revoke this connection?</p>
            <p className="mt-2 text-sm text-ink-600">{warning}</p>
            <div className="mt-4 flex justify-end gap-2">
              <SecondaryButton onClick={() => setConfirming(false)} type="button">
                Cancel
              </SecondaryButton>
              <form action={revokeConnection}>
                <input name="connectionId" type="hidden" value={person.connectionId} />
                <SubmitButton>Revoke</SubmitButton>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AcceptedList({ people }: { people: ConnectionPerson[] }) {
  if (!people.length) {
    return (
      <div className="mt-3">
        <EmptyState>
          No connections yet. Send a request above, or find someone in the directory.
        </EmptyState>
      </div>
    );
  }

  return (
    <ul className="mt-3 grid gap-2.5">
      {people.map((person) => (
        <li
          className="flex items-center justify-between gap-3 rounded-md border border-cream-400 bg-cream-50/60 px-3 py-2.5"
          key={person.connectionId}
        >
          <div className="flex min-w-0 items-center gap-3">
            <PersonAvatar name={person.name} />
            <PersonMeta
              detail={person.role}
              name={person.name}
              username={person.username}
            />
          </div>
          <RevokeButton person={person} />
        </li>
      ))}
    </ul>
  );
}

export function ConnectionsPanel({ data }: { data: ConnectionPanelData }) {
  return (
    <div className="grid content-start gap-5">
      <Panel>
        <Kicker>Send a request</Kicker>
        <form action={sendConnectionRequest} className="mt-4 flex gap-2.5">
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

        <section className="mt-5 border-t border-cream-400 pt-5">
          <Kicker>Outgoing requests</Kicker>
          <PendingList people={data.outgoingPending} />
        </section>

        <section className="mt-5 border-t border-cream-400 pt-5">
          <Kicker>Connected</Kicker>
          <AcceptedList people={data.accepted} />
        </section>
      </Panel>
    </div>
  );
}
