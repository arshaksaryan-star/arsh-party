-- «Клиенты» (CRM) в админке: один человек = одна строка, у каждого постоянный номер AP-0001.
-- Заказы с сайта подтягиваются по телефону сами; прошлые и офлайн-заказы Арш вносит вручную.
create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),
  num           integer generated always as identity unique,
  name          text not null check (char_length(name) between 1 and 80),
  phone         text unique check (phone is null or phone ~ '^\+7\d{10}$'),
  company       text check (company is null or char_length(company) <= 120),
  is_company    boolean not null default false,
  birth_day     smallint check (birth_day is null or birth_day between 1 and 31),
  birth_month   smallint check (birth_month is null or birth_month between 1 and 12),
  birth_year    smallint check (birth_year is null or birth_year between 1900 and 2100),
  occasion      text check (occasion is null or char_length(occasion) <= 200),
  source        text check (source is null or char_length(source) <= 120),
  consent_ads   boolean not null default false,
  next_step     text check (next_step is null or char_length(next_step) <= 300),
  next_step_at  date,
  note          text check (note is null or char_length(note) <= 2000),
  import_key    text unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Заказы клиента, которых нет на сайте: прошлые, по телефону, праздники.
create table if not exists public.client_orders (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  order_date  date not null,
  amount      integer not null check (amount >= 0 and amount <= 100000000),
  stars       text[] not null default '{}',
  note        text check (note is null or char_length(note) <= 500),
  source      text not null default 'manual' check (source in ('manual', 'import')),
  verified    boolean not null default true,
  import_key  text unique,
  created_at  timestamptz not null default now()
);
create index if not exists client_orders_client_idx on public.client_orders (client_id, order_date desc);

alter table public.clients       enable row level security;
alter table public.client_orders enable row level security;

-- Ручные отметки Арша: уровень (например, AP Card авансом) и «вернуть».
alter table public.clients add column if not exists tier_manual text check (tier_manual is null or tier_manual in ('guest', 'friend', 'own', 'card'));
alter table public.clients add column if not exists mark_back boolean not null default false;
alter table public.clients add column if not exists last_name text check (last_name is null or char_length(last_name) <= 80);
