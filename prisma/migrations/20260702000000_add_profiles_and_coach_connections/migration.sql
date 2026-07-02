create type public.coach_connection_status as enum ('pending', 'accepted');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coach_connections (
  player_id uuid not null references public.players(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  requested_by_id uuid not null references auth.users(id) on delete cascade,
  status public.coach_connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (player_id, coach_id),
  constraint coach_connections_requested_by_participant_check
    check (requested_by_id = player_id or requested_by_id = coach_id)
);

create index coach_connections_player_status_idx
  on public.coach_connections (player_id, status);

create index coach_connections_coach_status_idx
  on public.coach_connections (coach_id, status);

alter table public.profiles enable row level security;
alter table public.coach_connections enable row level security;
