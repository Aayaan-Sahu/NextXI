import {
  respondToConnectionRequest,
  sendConnectionRequest,
} from "@/app/dashboard/connections/actions";
import type { ConnectionPanelData, ConnectionPerson } from "@/lib/connections";
import { Field, Form, Panel, PrimaryButton, SecondaryButton, TextInput } from "@/components/ui";

function PersonLine({ person }: { person: ConnectionPerson }) {
  return (
    <span>
      {person.name}
      {person.username ? (
        <span className="text-stone-600 dark:text-neutral-300"> @{person.username}</span>
      ) : null}
      {person.role ? (
        <span className="text-stone-600 dark:text-neutral-300"> · {person.role}</span>
      ) : null}
    </span>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-sm text-stone-600 dark:text-neutral-300">{children}</p>;
}

function PendingList({ people }: { people: ConnectionPerson[] }) {
  if (!people.length) return <Empty>None.</Empty>;

  return (
    <ul className="grid gap-2">
      {people.map((person) => (
        <li
          className="border-t border-stone-300 pt-2 text-sm dark:border-neutral-700"
          key={person.connectionId}
        >
          <PersonLine person={person} />
        </li>
      ))}
    </ul>
  );
}

function IncomingList({ people }: { people: ConnectionPerson[] }) {
  if (!people.length) return <Empty>None.</Empty>;

  return (
    <ul className="grid gap-3">
      {people.map((person) => (
        <li
          className="flex items-center justify-between gap-3 border-t border-stone-300 pt-3 text-sm dark:border-neutral-700"
          key={person.connectionId}
        >
          <PersonLine person={person} />
          <div className="flex gap-2">
            <form action={respondToConnectionRequest}>
              <input name="connectionId" type="hidden" value={person.connectionId} />
              <input name="response" type="hidden" value="accept" />
              <PrimaryButton type="submit">Accept</PrimaryButton>
            </form>
            <form action={respondToConnectionRequest}>
              <input name="connectionId" type="hidden" value={person.connectionId} />
              <input name="response" type="hidden" value="decline" />
              <SecondaryButton type="submit">Decline</SecondaryButton>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ConnectionsPanel({ data }: { data: ConnectionPanelData }) {
  return (
    <Panel title="Connections">
      <div className="grid gap-5">
        <Form action={sendConnectionRequest}>
          <Field>
            Username
            <TextInput
              name="username"
              pattern="[A-Za-z0-9_]{3,30}"
              placeholder="username"
              required
              title="Use 3-30 letters, numbers, or underscores."
              type="text"
            />
          </Field>
          <PrimaryButton type="submit">Send request</PrimaryButton>
        </Form>

        <section className="grid gap-2">
          <h3 className="text-sm font-semibold">Incoming pending</h3>
          <IncomingList people={data.incomingPending} />
        </section>

        <section className="grid gap-2">
          <h3 className="text-sm font-semibold">Outgoing pending</h3>
          <PendingList people={data.outgoingPending} />
        </section>

        <section className="grid gap-2">
          <h3 className="text-sm font-semibold">Accepted connections</h3>
          <PendingList people={data.accepted} />
        </section>
      </div>
    </Panel>
  );
}
