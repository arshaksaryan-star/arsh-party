-- Arsh Party: праздники. Выполнить один раз: Supabase → SQL Editor → вставить → Run.

-- Праздники: архив мероприятий (страница /prazdniki) ------------------------
-- Фото лежат в публичном хранилище media (папка events/), видео — ссылки на VK Видео.
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 2 and 120),
  direction    text not null check (direction in ('mangal', 'sshp', 'catering', 'events', 'host')),
  event_date   date,
  place        text check (place is null or char_length(place) <= 120),
  summary      text check (summary is null or char_length(summary) <= 600),
  quote        text check (quote is null or char_length(quote) <= 400),
  quote_author text check (quote_author is null or char_length(quote_author) <= 80),
  cover_url    text,
  photos       jsonb not null default '[]'::jsonb,   -- ["https://…/media/events/<id>/<file>.jpg", …]
  videos       jsonb not null default '[]'::jsonb,   -- ["https://vkvideo.ru/video-1_2", …]
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists events_published_date_idx
  on public.events (is_published, event_date desc nulls last, created_at desc);

alter table public.events enable row level security;
grant select, insert, update, delete on public.events to service_role;
