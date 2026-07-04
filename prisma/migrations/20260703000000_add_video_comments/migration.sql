create table public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.player_videos(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_username text not null,
  author_name text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index video_comments_video_created_at_idx
  on public.video_comments (video_id, created_at);

alter table public.video_comments enable row level security;
