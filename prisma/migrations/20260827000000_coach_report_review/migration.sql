-- Coach review of AI coaching reports. A report the pipeline marks ready is
-- shown to the player only once a connected coach approves it — or at once
-- when the player has no connected coach to wait for. Comments left while a
-- report awaits review are held and released together with it.
-- The rules live in lib/report-review.ts.

create type "public"."report_review_status" as enum (
  'awaiting_review',
  'held',
  'approved',
  'released'
);

alter table "public"."reports"
  add column "review_status" "public"."report_review_status" not null default 'awaiting_review',
  add column "reviewed_by_id" uuid references auth.users(id) on delete set null,
  add column "reviewed_by_name" text,
  add column "reviewed_at" timestamptz,
  add column "coach_note" text check (coach_note is null or char_length(coach_note) <= 500),
  add column "hold_reason" text check (hold_reason is null or char_length(hold_reason) <= 500);

-- Grandfather: every report players can already see stays visible, with no
-- coach stamp — nobody reviewed it.
update "public"."reports" set review_status = 'released' where status = 'ready';

-- The coach queue, the nav badge and the admin held list narrow by review
-- state first.
create index "reports_review_status_updated_at_idx"
  on "public"."reports" ("review_status", "updated_at");

alter table "public"."video_comments"
  add column "timestamp_sec" double precision check (timestamp_sec is null or timestamp_sec >= 0),
  add column "published_at" timestamptz;

-- Every existing comment was visible the moment it was posted.
update "public"."video_comments" set published_at = created_at;
