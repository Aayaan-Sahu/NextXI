import { inviteClubCoach, removeClubCoach } from "@/app/dashboard/club/[clubId]/actions";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, Field, FieldHint, Form, TextInput } from "@/components/ui";
import { ConnectionStatus } from "@/app/generated/prisma/enums";
import { CLUB_ROLE_LABELS } from "@/lib/clubs";
import type { ClubCoachEntry } from "@/lib/clubs.server";

/**
 * Who can act for the club. Removal is `ink-600` at rest — six maroon links
 * down a list would make the list about removing people.
 */
export function ClubCoaches({
  canManage,
  clubId,
  coaches,
}: {
  canManage: boolean;
  clubId: string;
  coaches: ClubCoachEntry[];
}) {
  return (
    <>
      {coaches.length ? (
        <ul className="border-b border-cream-400">
          {coaches.map((coach) => {
            const pending = coach.status === ConnectionStatus.PENDING;
            const facts = [
              coach.username ? `@${coach.username}` : null,
              CLUB_ROLE_LABELS[coach.role],
              coach.certifications[0] ?? null,
              pending ? "Invited" : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li
                className="flex items-center justify-between gap-5 border-t border-cream-400 py-3.5"
                key={coach.id}
              >
                <div className="min-w-0">
                  <p className="text-ui font-semibold text-ink-900">{coach.name}</p>
                  <p className="mt-0.5 text-caption text-ink-600">{facts}</p>
                </div>
                {canManage ? (
                  <form action={removeClubCoach} className="shrink-0">
                    <input name="clubId" type="hidden" value={clubId} />
                    <input name="coachId" type="hidden" value={coach.id} />
                    <SubmitButton variant="quiet">{pending ? "Cancel" : "Remove"}</SubmitButton>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState>No coaches yet. Invite one by username below.</EmptyState>
      )}

      {canManage ? (
        <Form action={inviteClubCoach} className="mt-5 max-w-[420px]">
          <input name="clubId" type="hidden" value={clubId} />
          <Field>
            Invite a coach
            <TextInput
              maxLength={30}
              minLength={3}
              name="username"
              pattern="[A-Za-z0-9_]{3,30}"
              placeholder="username"
              required
              type="text"
            />
            <FieldHint>
              They accept from their own home page. Only approved coaches can be invited.
            </FieldHint>
          </Field>
          <SubmitButton>Send invitation</SubmitButton>
        </Form>
      ) : null}
    </>
  );
}
