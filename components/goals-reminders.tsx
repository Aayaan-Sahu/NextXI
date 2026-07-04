import {
  createGoal,
  createReminder,
  deleteGoal,
  deleteReminder,
  toggleGoalComplete,
  toggleReminderComplete,
} from "@/app/dashboard/progress/actions";
import { Field, Form, Panel, PrimaryButton, TextInput } from "@/components/ui";
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
  "cursor-pointer text-sm font-medium text-emerald-700 hover:underline";
const deleteButton =
  "cursor-pointer text-sm font-medium text-stone-500 hover:text-red-700";

function GoalMeta({ goal }: { goal: GoalItem }) {
  const parts: string[] = [];
  if (goal.metric) parts.push(goal.metric);
  if (goal.target !== null) parts.push(`target ${goal.target}`);
  if (goal.horizonDate) parts.push(`by ${formatDate(goal.horizonDate)}`);

  if (!parts.length) return null;
  return <p className="text-sm text-stone-600">{parts.join(" · ")}</p>;
}

function GoalRow({ goal }: { goal: GoalItem }) {
  const completed = goal.completedAt !== null;

  return (
    <li className="grid gap-1.5 border-t border-stone-200 pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <p
          className={
            completed
              ? "font-medium text-stone-500 line-through"
              : "font-medium text-neutral-950"
          }
        >
          {goal.title}
        </p>
        <form action={deleteGoal}>
          <input name="id" type="hidden" value={goal.id} />
          <button className={deleteButton} type="submit">
            Delete
          </button>
        </form>
      </div>
      <GoalMeta goal={goal} />
      <form action={toggleGoalComplete}>
        <input name="id" type="hidden" value={goal.id} />
        <button className={textButton} type="submit">
          {completed ? "Reopen" : "Mark complete"}
        </button>
      </form>
    </li>
  );
}

function ReminderRow({ reminder }: { reminder: ReminderItem }) {
  const completed = reminder.completedAt !== null;

  return (
    <li className="grid gap-1.5 border-t border-stone-200 pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <p
          className={
            completed ? "text-stone-500 line-through" : "text-neutral-950"
          }
        >
          {reminder.text}
        </p>
        <form action={deleteReminder}>
          <input name="id" type="hidden" value={reminder.id} />
          <button className={deleteButton} type="submit">
            Delete
          </button>
        </form>
      </div>
      {reminder.dueAt ? (
        <p className="text-sm text-stone-600">Due {formatDate(reminder.dueAt)}</p>
      ) : null}
      <form action={toggleReminderComplete}>
        <input name="id" type="hidden" value={reminder.id} />
        <button className={textButton} type="submit">
          {completed ? "Reopen" : "Mark done"}
        </button>
      </form>
    </li>
  );
}

function GoalsPanel({ goals }: { goals: GoalItem[] }) {
  return (
    <Panel title="Goals">
      <div className="grid gap-5">
        <Form action={createGoal}>
          <Field>
            Goal
            <TextInput
              maxLength={200}
              name="title"
              placeholder="e.g. Improve strike rate"
              required
              type="text"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              Metric
              <TextInput
                maxLength={80}
                name="metric"
                placeholder="Optional"
                type="text"
              />
            </Field>
            <Field>
              Target
              <TextInput
                min={0}
                name="target"
                placeholder="Optional"
                step="any"
                type="number"
              />
            </Field>
            <Field>
              Target date
              <TextInput name="horizonDate" type="date" />
            </Field>
          </div>
          <PrimaryButton type="submit">Add goal</PrimaryButton>
        </Form>

        {goals.length ? (
          <ul className="grid gap-3">
            {goals.map((goal) => (
              <GoalRow goal={goal} key={goal.id} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-600">No goals yet. Set one above.</p>
        )}
      </div>
    </Panel>
  );
}

function RemindersPanel({ reminders }: { reminders: ReminderItem[] }) {
  return (
    <Panel title="Reminders">
      <div className="grid gap-5">
        <Form action={createReminder}>
          <Field>
            Reminder
            <TextInput
              maxLength={300}
              name="text"
              placeholder="e.g. Book a net session"
              required
              type="text"
            />
          </Field>
          <Field>
            Due date
            <TextInput name="dueAt" type="date" />
          </Field>
          <PrimaryButton type="submit">Add reminder</PrimaryButton>
        </Form>

        {reminders.length ? (
          <ul className="grid gap-3">
            {reminders.map((reminder) => (
              <ReminderRow key={reminder.id} reminder={reminder} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-600">No reminders yet.</p>
        )}
      </div>
    </Panel>
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
    <div className="grid gap-5 md:grid-cols-2">
      <GoalsPanel goals={goals} />
      <RemindersPanel reminders={reminders} />
    </div>
  );
}
