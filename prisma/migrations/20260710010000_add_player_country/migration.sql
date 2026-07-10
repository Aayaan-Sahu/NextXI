alter table public.players
  add column country text;

update public.players
  set country = 'England'
  where country is null;

alter table public.players
  alter column country set not null;
