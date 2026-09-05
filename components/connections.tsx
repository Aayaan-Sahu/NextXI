"use client";

import { SubmitButton } from "@/components/submit-button";
import { useState } from "react";
import {
  respondToConnectionRequest,
  revokeConnection,
} from "@/app/dashboard/connections/actions";
import type { ConnectionPanelData, ConnectionPerson } from "@/lib/connections";
import {
  ConfirmDialog,
  DialogActions,
  GhostButton,
  SectionHeading,
  TextInput,
} from "@/components/ui";

const AVATAR_TONES: Record<string, string> = {
  player: "bg-olive-700 text-cream-200",
  self: "bg-gold-500 text-ink-900",
};

/**
 * A roster avatar. Coaches sit on ink, players on olive and you on peach, so a
 * list mixing all three reads its populations without a second label.
 */
export function PersonAvatar({
  name,
  role,
  size = "md",
}: {
  name: string;
  role?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "size-[34px] text-caption",
    md: "size-[38px] text-ui",
    lg: "size-[52px] text-title",
  };

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${sizes[size]} ${
        (role && AVATAR_TONES[role]) ?? "bg-pitch-900 text-gold-500"
      }`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function RosterRow({
  actions,
  detail,
  name,
  role,
  username,
}: {
  actions?: React.ReactNode;
  detail?: string | null;
  name: string;
  role?: string | null;
  username: string | null;
}) {
  return (
    <li className="flex items-center gap-3.5 rounded-lg p-3 hover:bg-cream-50">
      <PersonAvatar name={name} role={role} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-body font-semibold text-ink-900">{name}</span>
          {username ? <span className="text-caption text-ink-600">@{username}</span> : null}
        </div>
        {detail ? (
          <p className="mt-0.5 line-clamp-1 text-caption text-ink-600 first-letter:uppercase">
            {detail}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </li>
  );
}

/** Confirm dialog + form that revokes an accepted connection. */
function RevokeButton({ person }: { person: ConnectionPerson }) {
  const [confirming, setConfirming] = useState(false);

  const warning =
    person.role === "coach"
      ? "This coach will lose access to your videos. Your conversation disappears from Messages straight away."
      : "You will lose access to this person's videos and messages.";

  return (
    <>
      <button
        className="cursor-pointer rounded-md bg-cream-300 px-3.5 py-[7px] text-caption font-semibold text-rust-600 hover:bg-cream-350"
        onClick={() => setConfirming(true)}
        type="button"
      >
        Revoke
      </button>
      {confirming ? (
        <ConfirmDialog
          description={warning}
          onDismiss={() => setConfirming(false)}
          title="Revoke this connection?"
        >
          <DialogActions>
            <GhostButton onClick={() => setConfirming(false)} type="button">
              Cancel
            </GhostButton>
            <form action={revokeConnection}>
              <input name="connectionId" type="hidden" value={person.connectionId} />
              <SubmitButton variant="danger">Revoke</SubmitButton>
            </form>
          </DialogActions>
        </ConfirmDialog>
      ) : null}
    </>
  );
}

/** One roster group — "Coaches — 3" — with its rows under a quiet label. */
function RosterGroup({
  label,
  people,
}: {
  label: string;
  people: ConnectionPerson[];
}) {
  if (!people.length) return null;

  return (
    <div>
      <p className="text-caption text-ink-600">
        {label} — {people.length}
      </p>
      <ul className="mt-2 -ml-3">
        {people.map((person) => (
          <RosterRow
            actions={<RevokeButton person={person} />}
            detail={person.role}
            key={person.connectionId}
            name={person.name}
            role={person.role}
            username={person.username}
          />
        ))}
      </ul>
    </div>
  );
}

/** The coach roster for the Coaches tab — a plain grouped list. */
export function CoachConnections({ data }: { data: ConnectionPanelData }) {
  const coaches = data.accepted.filter((person) => person.role === "coach");
  return <RosterGroup label="Coaches" people={coaches} />;
}

/**
 * The player roster for the Players tab, with a live filter over who you're
 * already connected to — a lighter, client-side search, distinct from the
 * directory search above it that finds someone new to connect with.
 */
export function PlayerConnections({ data }: { data: ConnectionPanelData }) {
  const [query, setQuery] = useState("");
  const players = data.accepted.filter((person) => person.role !== "coach");

  if (!players.length) return null;

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? players.filter(
        (person) =>
          person.name.toLowerCase().includes(trimmed) ||
          person.username?.toLowerCase().includes(trimmed),
      )
    : players;

  return (
    <section>
      <SectionHeading>Connected players</SectionHeading>
      <TextInput
        aria-label="Filter your connected players by name"
        className="mt-3.5"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filter by name or @username"
        type="search"
        value={query}
      />
      {filtered.length ? (
        <ul className="mt-4 -ml-3">
          {filtered.map((person) => (
            <RosterRow
              actions={<RevokeButton person={person} />}
              detail={person.role}
              key={person.connectionId}
              name={person.name}
              role={person.role}
              username={person.username}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-3.5 text-ui text-ink-600">No connected players match your search.</p>
      )}
    </section>
  );
}

/**
 * Accept / Ignore for a request the other person already sent — used by the
 * pending column and by a directory row whose search match turns out to
 * already be waiting on the viewer, rather than the other way around.
 */
export function RespondButtons({ connectionId }: { connectionId: string }) {
  return (
    <div className="flex gap-2">
      <form action={respondToConnectionRequest} className="flex-1">
        <input name="connectionId" type="hidden" value={connectionId} />
        <input name="response" type="hidden" value="accept" />
        <SubmitButton className="w-full !py-[7px] !text-caption">Accept</SubmitButton>
      </form>
      <form action={respondToConnectionRequest} className="flex-1">
        <input name="connectionId" type="hidden" value={connectionId} />
        <input name="response" type="hidden" value="decline" />
        <button
          className="w-full cursor-pointer rounded-md border border-cream-400 py-[7px] text-caption font-semibold text-ink-600 hover:bg-cream-100"
          type="submit"
        >
          Ignore
        </button>
      </form>
    </div>
  );
}

/**
 * The pending column: requests waiting on you, then the ones you are waiting
 * on. Ignoring is as easy as accepting — neither is a destructive act.
 */
export function PendingColumn({ data }: { data: ConnectionPanelData }) {
  return (
    <div className="grid gap-8">
      <section>
        <SectionHeading>Pending</SectionHeading>
        {data.incomingPending.length ? (
          <ul className="mt-4 grid gap-[18px]">
            {data.incomingPending.map((person) => (
              <li
                className="border-t border-cream-400 pt-[18px] first:border-t-0 first:pt-0"
                key={person.connectionId}
              >
                <div className="flex items-center gap-3">
                  <PersonAvatar name={person.name} role={person.role} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-ui font-semibold text-ink-900">{person.name}</p>
                    <p className="truncate text-caption text-ink-600 first-letter:uppercase">
                      {person.role}
                      {person.username ? ` · @${person.username}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5">
                  <RespondButtons connectionId={person.connectionId} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3.5 text-ui text-ink-600">No requests waiting on you.</p>
        )}
      </section>

      <section>
        <SectionHeading>Requests you sent</SectionHeading>
        {data.outgoingPending.length ? (
          <ul className="mt-3">
            {data.outgoingPending.map((person) => (
              <li
                className="flex items-center gap-3 border-t border-cream-400 py-3 first:border-t-0 first:pt-0"
                key={person.connectionId}
              >
                <PersonAvatar name={person.name} role={person.role} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-ui font-semibold text-ink-900">{person.name}</p>
                  <p className="truncate text-caption text-ink-600">
                    Pending{person.username ? ` · @${person.username}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3.5 text-ui text-ink-600">No outgoing requests right now.</p>
        )}
      </section>
    </div>
  );
}
