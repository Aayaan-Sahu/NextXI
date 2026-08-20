import { SubmitButton } from "@/components/submit-button";
import {
  createGoal,
  createReminder,
  deleteGoal,
  deleteReminder,
  toggleGoalComplete,
  toggleReminderComplete,
} from "@/app/dashboard/progress/actions";
import { Field, Form, SectionHeading, TextInput } from "@/components/ui";
import type { GoalItem, ReminderItem } from "@/lib/progress";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const textButton =
  "cursor-pointer text-caption font-semibold whitespace-nowrap text-ink-600 hover:text-ink-900";
const deleteButton =
  "cursor-pointer text-caption font-semibold whitespace-nowrap text-ink-600 hover:text-rust-600";

/** The caption under a goal — its metric, and when it is due. */
function goalCaption(goal: GoalItem) {
  const parts: string[] = [];
  if (goal.metric) parts.push(goal.metric);
  if (goal.horizonDate) parts.push(`Target ${formatDate(goal.horizonDate)}`);
  if (!parts.length) return goal.target === null ? null : `Target ${goal.target}`;
  return parts.join(" · ");
}

function GoalRow({ goal }: { goal: GoalItem }) {
  const completed = goal.completedAt !== null;
  const caption = goalCaption(goal);

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`text-ui font-semibold ${completed ? "text-ink-400 line-through" : "text-ink-900"}`}
        >
          {goal.title}
        </span>
        {goal.target !== null ? (
          <span className="shrink-0 text-ui text-ink-800 tabular-nums">{goal.target}</span>
        ) : null}
      </div>
      {/* No meter here. A goal stores a target but never a current value, so a
          bar would have to draw an empty track next to every open goal and
          read as "0% done" — a number we have not measured. */}
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="text-caption text-ink-600">
          {caption ?? (completed ? "Complete" : "In progress")}
        </span>
        <span className="flex shrink-0 items-baseline gap-3">
          <form action={toggleGoalComplete}>
            <input name="id" type="hidden" value={goal.id} />
            <button className={textButton} type="submit">
              {completed ? "Reopen" : "Mark complete"}
            </button>
          </form>
          <form action={deleteGoal}>
            <input name="id" type="hidden" value={goal.id} />
            <button className={deleteButton} type="submit">
              Delete
            </button>
          </form>
        </span>
      </div>
    </li>
  );
}

function ReminderRow({ reminder }: { reminder: ReminderItem }) {
  const completed = reminder.completedAt !== null;

  return (
    <li className="flex items-start justify-between gap-3 border-t border-cream-400 py-3">
      <div className="min-w-0">
        <p
          className={`text-ui font-semibold ${completed ? "text-ink-400 line-through" : "text-ink-900"}`}
        >
          {reminder.text}
        </p>
        {reminder.dueAt ? (
          <p className="mt-[3px] text-caption text-ink-600">Due {formatDate(reminder.dueAt)}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-baseline gap-3">
        <form action={toggleReminderComplete}>
          <input name="id" type="hidden" value={reminder.id} />
          <button className={textButton} type="submit">
            {completed ? "Reopen" : "Mark done"}
          </button>
        </form>
        <form action={deleteReminder}>
          <input name="id" type="hidden" value={reminder.id} />
          <button className={deleteButton} type="submit">
            Delete
          </button>
        </form>
      </div>
    </li>
  );
}

export function Goals({ goals }: { goals: GoalItem[] }) {
  return (
    <section>
      <SectionHeading>Goals</SectionHeading>
      {goals.length ? (
        <ul className="mt-4 grid gap-[18px]">
          {goals.map((goal) => (
            <GoalRow goal={goal} key={goal.id} />
          ))}
        </ul>
      ) : (
        <p className="mt-3.5 text-ui text-ink-600">No goals yet. Set one below.</p>
      )}

      <Form action={createGoal} className="mt-5">
        <Field>
          <span className="sr-only">Goal</span>
          <TextInput
            maxLength={200}
            name="title"
            placeholder="e.g. Improve strike rate"
            required
            type="text"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field className="text-caption">
            Metric
            <TextInput maxLength={80} name="metric" placeholder="Optional" type="text" />
          </Field>
          <Field className="text-caption">
            Target
            <TextInput min={0} name="target" placeholder="Optional" step="any" type="number" />
          </Field>
          <Field className="text-caption">
            Target date
            <TextInput name="horizonDate" type="date" />
          </Field>
        </div>
        <SubmitButton className="justify-self-start" variant="secondary">
          Add goal
        </SubmitButton>
      </Form>
    </section>
  );
}

export function Reminders({ reminders }: { reminders: ReminderItem[] }) {
  return (
    <section>
      <SectionHeading>Reminders</SectionHeading>
      {reminders.length ? (
        <ul className="mt-3">
          {reminders.map((reminder) => (
            <ReminderRow key={reminder.id} reminder={reminder} />
          ))}
        </ul>
      ) : (
        <p className="mt-3.5 text-ui text-ink-600">No reminders yet.</p>
      )}

      <Form action={createReminder} className="mt-5">
        <Field>
          <span className="sr-only">Reminder</span>
          <TextInput
            maxLength={300}
            name="text"
            placeholder="e.g. Book a net session"
            required
            type="text"
          />
        </Field>
        <Field className="text-caption">
          Due date
          <TextInput name="dueAt" type="date" />
        </Field>
        <SubmitButton className="justify-self-start" variant="secondary">
          Add reminder
        </SubmitButton>
      </Form>
    </section>
  );
}

export function GoalsReminders({
  goals,
  reminders,
}: {
  goals: GoalItem[];
  reminders: ReminderItem[];
}) {
  return (
    <div className="grid gap-9">
      <Goals goals={goals} />
      <Reminders reminders={reminders} />
    </div>
  );
}
