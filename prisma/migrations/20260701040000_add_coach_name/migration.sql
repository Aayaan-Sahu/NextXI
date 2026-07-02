alter table public.coaches add column name text;

update public.coaches
set name = 'Coach'
where name is null;

alter table public.coaches alter column name set not null;
