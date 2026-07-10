update public.players
  set height_cm = 180
  where height_cm is null;

alter table public.players
  alter column height_cm set not null;
