create type public.connection_status as enum ('pending', 'accepted');

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  requested_by_id uuid not null references auth.users(id) on delete cascade,
  status public.connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connections_user_order_check check (user_a_id < user_b_id),
  constraint connections_requester_check check (requested_by_id in (user_a_id, user_b_id)),
  constraint connections_user_a_user_b_key unique (user_a_id, user_b_id)
);

create index connections_user_a_status_idx on public.connections (user_a_id, status);
create index connections_user_b_status_idx on public.connections (user_b_id, status);

-- Migrate existing player<->coach connections into the unified model.
insert into public.connections (user_a_id, user_b_id, requested_by_id, status, created_at, updated_at)
select
  least(player_id, coach_id),
  greatest(player_id, coach_id),
  requested_by_id,
  status::text::public.connection_status,
  created_at,
  updated_at
from public.coach_connections;

drop table public.coach_connections;
drop type public.coach_connection_status;

alter table public.connections enable row level security;
