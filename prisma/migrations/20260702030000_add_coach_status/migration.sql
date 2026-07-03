create type public.coach_status as enum ('pending', 'approved', 'rejected');

alter table public.coaches
  add column status public.coach_status not null default 'pending';

-- Keep coaches that already exist (pre-vetting) usable.
update public.coaches set status = 'approved';
