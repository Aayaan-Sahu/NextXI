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
  "cursor-pointer text-xs font-semibold whitespace-nowrap text-ink-600 hover:text-ink-900";
const deleteButton =
  "cursor-pointer text-xs font-semibold whitespace-nowrap text-rust-600 hover:text-rust-700";

function GoalMeta({ goal }: { goal: GoalItem }) {
  const parts: string[] = [];
  if (goal.metric) parts.push(goal.metric);
  if (goal.target !== null) parts.push(`target ${goal.target}`);
  if (goal.horizonDate) parts.push(`by ${formatDate(goal.horizonDate)}`);

  if (!parts.length) return null;
  return (
    <p
      className={
        goal.completedAt !== null
          ? "mt-[3px] text-xs text-sage-400"
          : "mt-[3px] text-xs text-ink-600"
      }
    >
      {parts.join(" · ")}
    </p>
  );
}

function GoalRow({ goal }: { goal: GoalItem }) {
  const completed = goal.completedAt !== null;

  return (
    <li className="flex items-start justify-between gap-3 border-t border-cream-400 py-[13px]">
      <div>
        <p
          className={
            completed
              ? "text-sm font-semibold text-sage-400 line-through"
              : "text-sm font-semibold"
          }
        >
          {goal.title}
        </p>
        <GoalMeta goal={goal} />
      </div>
      <div className="flex shrink-0 items-baseline gap-3">
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
      </div>
    </li>
  );
}

function ReminderRow({ reminder }: { reminder: ReminderItem }) {
  const completed = reminder.completedAt !== null;

  return (
    <li className="flex items-start justify-between gap-3 border-t border-cream-400 py-[13px]">
      <div>
        <p
          className={
            completed
              ? "text-sm font-semibold text-sage-400 line-through"
              : "text-sm font-semibold"
          }
        >
          {reminder.text}
        </p>
        {reminder.dueAt ? (
          <p
            className={
              completed
                ? "mt-[3px] text-xs text-sage-400"
                : "mt-[3px] text-xs text-ink-600"
            }
          >
            Due {formatDate(reminder.dueAt)}
          </p>
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

function GoalsPanel({ goals }: { goals: GoalItem[] }) {
  return (
    <Panel title="Goals">
      <Form action={createGoal}>
        <div className="flex gap-2.5">
          <label className="grid flex-1">
            <span className="sr-only">Goal</span>
            <TextInput
              maxLength={200}
              name="title"
              placeholder="e.g. Improve strike rate"
              required
              type="text"
            />
          </label>
          <PrimaryButton type="submit">Add goal</PrimaryButton>
        </div>
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
      </Form>

      {goals.length ? (
        <ul className="mt-4">
          {goals.map((goal) => (
            <GoalRow goal={goal} key={goal.id} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-600">No goals yet. Set one above.</p>
      )}
    </Panel>
  );
}

function RemindersPanel({ reminders }: { reminders: ReminderItem[] }) {
  return (
    <Panel title="Reminders">
      <Form action={createReminder}>
        <div className="flex gap-2.5">
          <label className="grid flex-1">
            <span className="sr-only">Reminder</span>
            <TextInput
              maxLength={300}
              name="text"
              placeholder="e.g. Book a net session"
              required
              type="text"
            />
          </label>
          <PrimaryButton type="submit">Add reminder</PrimaryButton>
        </div>
        <Field>
          Due date
          <TextInput name="dueAt" type="date" />
        </Field>
      </Form>

      {reminders.length ? (
        <ul className="mt-4">
          {reminders.map((reminder) => (
            <ReminderRow key={reminder.id} reminder={reminder} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-600">No reminders yet.</p>
      )}
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
    <div className="grid gap-5">
      <GoalsPanel goals={goals} />
      <RemindersPanel reminders={reminders} />
    </div>
  );
}
