-- Arsh Party: отзывы с сайта. Выполнить один раз: Supabase → SQL Editor → вставить → Run.

-- Отзывы, оставленные на сайте (страница /otziv) ---------------------------
-- Новый отзыв ждёт модерации (status = new). На сайте видны только published.
create table if not exists public.site_reviews (
  id           uuid primary key default gen_random_uuid(),
  number       bigint generated always as identity unique,
  name         text not null check (char_length(name) between 2 and 60),
  rating       smallint not null check (rating between 1 and 5),
  text         text not null check (char_length(text) between 10 and 1500),
  status       text not null default 'new' check (status in ('new', 'published', 'hidden')),
  telegram_sent boolean not null default false,
  created_at   timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists site_reviews_status_created_idx
  on public.site_reviews (status, created_at desc);

alter table public.site_reviews enable row level security;
grant select, insert, update, delete on public.site_reviews to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Фото и видео к отзывам (добавлено 09.11.2026) ------------------------------
alter table public.site_reviews add column if not exists media jsonb not null default '[]'::jsonb;

-- Закрытое хранилище: файлы видны только через временные ссылки с сервера.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('review-uploads', 'review-uploads', false, 52428800,
            array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'])
    on conflict (id) do nothing;
  end if;
end $$;
