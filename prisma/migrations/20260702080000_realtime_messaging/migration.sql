-- Realtime messaging over websockets (Supabase Realtime private channels).
--
-- Every insert/update on public.messages is broadcast to the private topic
-- `connection:<connection_id>`. Clients never read the messages table
-- directly (public tables stay deny-all under RLS; Prisma remains the trust
-- boundary) — they only receive broadcasts, gated by the realtime.messages
-- policy below.

-- Broadcast message changes to the connection's private topic. SECURITY
-- DEFINER so the write to realtime's queue works regardless of the role
-- performing the DML.
create or replace function public.broadcast_message_change()
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

create trigger messages_broadcast_change
after insert or update on public.messages
for each row execute function public.broadcast_message_change();

-- Authorization check for receiving broadcasts on a connection topic:
-- the subscriber must be a participant of that accepted connection.
-- SECURITY DEFINER because public.connections is deny-all for the
-- authenticated role; only this narrow predicate is exposed.
create or replace function public.can_receive_connection_broadcasts(topic_text text, uid uuid)
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

grant execute on function public.can_receive_connection_broadcasts(text, uuid) to authenticated;

-- realtime.messages does not exist in Prisma's shadow database.
do $$
begin
  if to_regclass('realtime.messages') is not null then
    create policy "connection_participants_receive_broadcasts"
    on realtime.messages
    for select
    to authenticated
    using ( public.can_receive_connection_broadcasts(realtime.topic(), (select auth.uid())) );
  end if;
end $$;
