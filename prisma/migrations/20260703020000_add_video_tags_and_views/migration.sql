create type public.video_category as enum ('pace', 'off_spin', 'leg_spin', 'batting');

create type public.handedness as enum ('right', 'left');

alter table public.player_videos
  add column category public.video_category,
  add column variation text,
  add column handedness public.handedness;

create table public.video_views (
  video_id uuid not null references public.player_videos(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (video_id, viewer_id)
);

create index video_views_viewer_idx
  on public.video_views (viewer_id);

alter table public.video_views enable row level security;
