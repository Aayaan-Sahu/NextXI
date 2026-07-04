create type public.player_status as enum ('active', 'pending_guardian');

create table public.guardians (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guardians enable row level security;

alter table public.players
  add column status public.player_status not null default 'active',
  add column guardian_code text unique,
  add column guardian_id uuid references public.guardians(id) on delete set null;
