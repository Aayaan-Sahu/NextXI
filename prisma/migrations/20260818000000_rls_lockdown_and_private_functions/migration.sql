-- Close the holes the Supabase database linter flagged.
--
-- The trust boundary has not moved: Prisma owns every read and write, server
-- actions are the only door, and public tables stay deny-all so PostgREST
-- hands anon and authenticated nothing. Two things had drifted out of that
-- shape — six tables added after the original lockdown never had RLS switched
-- on, and the realtime helpers sat in `public`, where PostgREST exposes every
-- function as an RPC endpoint.

-- 1. Tables that missed the lockdown.
--
-- No policies by design: RLS with zero policies denies everything, which is
-- exactly what we want for tables only Prisma touches. Until now anyone
-- holding the publishable key could read and write these six over
-- /rest/v1/. waitlist_entries and reports are the worst of it — emails and
-- player report contents.
alter table public.reports enable row level security;
alter table public.stat_entries enable row level security;
alter table public.goals enable row level security;
alter table public.reminders enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.practice_sessions enable row level security;

-- 2. Move the SECURITY DEFINER realtime helpers out of the exposed schema.
--
-- Anything in `public` is reachable at /rest/v1/rpc/<name>. Both helpers are
-- SECURITY DEFINER and were callable by anon, and
-- can_receive_connection_broadcasts takes an arbitrary uid — a stranger could
-- ask it whether any two users share an accepted connection, one guess at a
-- time. A schema PostgREST does not expose ends the whole class of problem
-- rather than patching one grant at a time.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.broadcast_message_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'connection:' || new.connection_id::text, -- topic
    tg_op,                                    -- event name (INSERT / UPDATE)
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end;
$$;

revoke all on function private.broadcast_message_change() from public;

drop trigger if exists messages_broadcast_change on public.messages;

create trigger messages_broadcast_change
after insert or update on public.messages
for each row execute function private.broadcast_message_change();

-- Authorization check for receiving broadcasts on a connection topic: the
-- subscriber must be a participant of that accepted connection. Still
-- SECURITY DEFINER because public.connections is deny-all for the
-- authenticated role; only this narrow predicate is exposed, and now only to
-- the RLS policy that needs it.
create or replace function private.can_receive_connection_broadcasts(topic_text text, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.connections c
    where 'connection:' || c.id::text = topic_text
      and c.status = 'accepted'
      and (uid = c.user_a_id or uid = c.user_b_id)
  );
$$;

revoke all on function private.can_receive_connection_broadcasts(text, uuid) from public;
grant execute on function private.can_receive_connection_broadcasts(text, uuid) to authenticated;

-- Point the realtime policy at the relocated predicate. realtime.messages
-- does not exist in Prisma's shadow database.
do $$
begin
  if to_regclass('realtime.messages') is not null then
    drop policy if exists "connection_participants_receive_broadcasts" on realtime.messages;

    create policy "connection_participants_receive_broadcasts"
    on realtime.messages
    for select
    to authenticated
    using ( private.can_receive_connection_broadcasts(realtime.topic(), (select auth.uid())) );
  end if;
end $$;

drop function if exists public.broadcast_message_change();
drop function if exists public.can_receive_connection_broadcasts(text, uuid);
