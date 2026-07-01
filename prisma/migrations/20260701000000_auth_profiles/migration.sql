create type public.visibility as enum ('private', 'public');

create table public.players (
  id uuid primary key,
  name text not null,
  date_of_birth date not null,
  club text not null,
  country text not null,
  visibility public.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coaches (
  id uuid primary key,
  accomplishments text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;
alter table public.coaches enable row level security;

do $$
begin
  if to_regclass('auth.users') is not null then
    alter table public.players
      add constraint players_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;

    alter table public.coaches
      add constraint coaches_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;
