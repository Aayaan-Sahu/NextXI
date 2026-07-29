-- Worker claim bookkeeping for AI coaching reports: attempt counting for
-- dead-lettering, claim timestamps for stale-reclaim, and an index for the
-- claim queue scan.
alter table "public"."reports"
  add column "attempts" integer not null default 0,
  add column "claimed_at" timestamptz;

create index "reports_status_created_at_idx"
  on "public"."reports" ("status", "created_at");
