create type public.player_video_status as enum ('pending_upload', 'ready');

create table public.player_videos (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null unique,
  original_filename text not null,
  content_type text not null,
  size_bytes integer not null,
  status public.player_video_status not null default 'pending_upload',
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_videos_size_check
    check (size_bytes > 0 and size_bytes <= 524288000),
  constraint player_videos_content_type_check
    check (content_type in ('video/mp4', 'video/quicktime', 'video/webm')),
  constraint player_videos_bucket_check
    check (storage_bucket = 'player-videos')
);

create index player_videos_player_created_at_idx
  on public.player_videos (player_id, created_at desc);

create index player_videos_player_status_idx
  on public.player_videos (player_id, status);

alter table public.player_videos enable row level security;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'player-videos',
  'player-videos',
  false,
  524288000,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
