-- Arsh Party: схема базы данных Supabase (Postgres).
-- Как применить: Supabase → SQL Editor → вставить весь файл → Run.
-- Повторный запуск безопасен: объекты создаются только если их ещё нет.
--
-- Доступ к таблицам только с сервера сайта через service_role key.
-- RLS включён, публичных политик нет: из браузера таблицы недоступны.

create extension if not exists pgcrypto;

-- Заказы с мангала ---------------------------------------------------------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  number        bigint generated always as identity unique,   -- «Заказ №128»
  client_id     uuid not null,                                -- браузер клиента, для истории
  name          text not null check (char_length(name) between 1 and 80),
  phone         text not null check (char_length(phone) between 5 and 32),
  address       text not null check (char_length(address) between 3 and 300),
  deliver_at    text not null default 'asap',                 -- 'asap' или время, например '19:30'
  payment       text not null check (payment in ('cash', 'card')),
  comment       text check (comment is null or char_length(comment) <= 1000),
  items         jsonb not null check (jsonb_typeof(items) = 'array'),  -- [{id, title, qty, price}]
  total         integer check (total is null or total >= 0), -- рубли; null, пока цен нет
  status        text not null default 'new'
                  check (status in ('new', 'confirmed', 'done', 'cancelled')),
  telegram_sent boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists orders_client_created_idx
  on public.orders (client_id, created_at desc);

-- Заявки: СШП, кейтеринг, организация, ведущий -----------------------------
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  number        bigint generated always as identity unique,
  client_id     uuid not null,
  direction     text not null check (direction in ('mangal', 'sshp', 'catering', 'events', 'host')),
  name          text not null check (char_length(name) between 1 and 80),
  phone         text not null check (char_length(phone) between 5 and 32),
  contact_via   text not null default 'call'
                  check (contact_via in ('call', 'whatsapp', 'telegram')),
  details       jsonb not null default '{}'::jsonb,           -- город, дата, гости, адрес, формат, бюджет
  comment       text check (comment is null or char_length(comment) <= 1000),
  status        text not null default 'new'
                  check (status in ('new', 'in_progress', 'won', 'lost')),
  telegram_sent boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists leads_created_idx
  on public.leads (created_at desc);

create index if not exists leads_client_idx
  on public.leads (client_id, created_at desc);

-- Защита: только сервер с service_role key -----------------------------------
alter table public.orders enable row level security;
alter table public.leads  enable row level security;

-- Тексты и контакты из админки --------------------------------------------
-- Две строки: key = 'site' и key = 'directions'. Поверх значений по умолчанию из кода.
create table if not exists public.content (
  key        text primary key check (key in ('site', 'directions')),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Меню доставки с мангала --------------------------------------------------
create table if not exists public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  category     text not null check (category in ('shashlik', 'chicken', 'lulya', 'fish', 'vegetables', 'sides', 'sauces', 'sets')),
  title        text not null check (char_length(title) between 2 and 80),
  weight       text check (weight is null or char_length(weight) <= 40),
  description  text check (description is null or char_length(description) <= 300),
  price        integer check (price is null or price between 0 and 1000000),  -- рубли; null — «Цена уточняется»
  image_url    text,
  is_available boolean not null default true,
  sort         integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists menu_items_category_sort_idx
  on public.menu_items (category, sort, title);

alter table public.content    enable row level security;
alter table public.menu_items enable row level security;

-- Публичное хранилище фото меню (Supabase Storage) -------------------------
-- Читать может кто угодно (фото на сайте), загружать — только сервер с service_role.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('media', 'media', true)
    on conflict (id) do nothing;
  end if;
end $$;

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

-- Доставка в заказах (добавлено 12.11.2026) ---------------------------------
alter table public.orders add column if not exists delivery_zone text
  check (delivery_zone is null or delivery_zone in ('near', 'far', 'outside', 'pickup'));
alter table public.orders add column if not exists delivery_fee integer check (delivery_fee is null or delivery_fee >= 0);
alter table public.orders add column if not exists subtotal integer check (subtotal is null or subtotal >= 0);

-- 2026-11-12: разделы «Курица» и «Рыба» — см. 2026-11-12-menu-categories.sql (constraint выше уже обновлён)

-- Подарочные сертификаты Arsh Party (страница /podarok, админка → «Сертификаты»).
-- Сертификат — аванс за будущую услугу. Срок — 12 месяцев с оплаты. Можно тратить частями.
create table if not exists public.certificates (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  kind           text not null check (kind in ('delivery', 'party', 'host', 'catering', 'custom')),
  title          text not null check (char_length(title) between 2 and 80),
  amount         integer not null check (amount between 1000 and 1000000),
  balance        integer not null check (balance >= 0),
  buyer_name     text not null check (char_length(buyer_name) between 2 and 80),
  buyer_phone    text not null check (char_length(buyer_phone) between 5 and 32),
  buyer_email    text check (buyer_email is null or char_length(buyer_email) <= 120),
  recipient_name text check (recipient_name is null or char_length(recipient_name) <= 80),
  message        text check (message is null or char_length(message) <= 300),
  status         text not null default 'pending' check (status in ('pending', 'paid', 'used', 'refunded', 'cancelled')),
  payment_id     text,
  paid_via       text check (paid_via is null or paid_via in ('online', 'manual')),
  paid_at        timestamptz,
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists certificates_created_idx on public.certificates (created_at desc);

create table if not exists public.certificate_uses (
  id             uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates (id) on delete cascade,
  amount         integer not null check (amount > 0),
  note           text check (note is null or char_length(note) <= 200),
  created_at     timestamptz not null default now()
);

create index if not exists certificate_uses_cert_idx on public.certificate_uses (certificate_id, created_at);

alter table public.certificates     enable row level security;
alter table public.certificate_uses enable row level security;

-- «Тайная звезда» /zvezda: сертификат-копилка, амбассадоры и шашлыкоины, заявки о сотрудничестве.
-- Повторный запуск ничего не ломает.

-- 1. Копилка: сертификат растёт бонусом в услугах, пока его не тратят.
alter table public.certificates drop constraint if exists certificates_kind_check;
alter table public.certificates add constraint certificates_kind_check
  check (kind in ('delivery', 'party', 'host', 'catering', 'custom', 'kopilka'));
alter table public.certificates add column if not exists growth_percent numeric(4,2)
  check (growth_percent is null or (growth_percent > 0 and growth_percent <= 5));
alter table public.certificates add column if not exists growth_max_months integer
  check (growth_max_months is null or growth_max_months between 1 and 12);
alter table public.certificates add column if not exists bonus integer not null default 0 check (bonus >= 0);
alter table public.certificates add column if not exists growth_stopped_at timestamptz;

-- 2. Амбассадоры: публичный код для друзей и секретный ключ для страницы баланса.
create table if not exists public.ambassadors (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[A-Z0-9]{4,12}$'),
  secret      text not null unique,
  name        text not null check (char_length(name) between 2 and 80),
  phone       text not null unique check (char_length(phone) between 5 and 32),
  status      text not null default 'active' check (status in ('active', 'blocked')),
  created_at  timestamptz not null default now()
);

-- Движение шашлыкоинов: + начисление, − списание. 1 коин = 1 ₽ скидки, сгорают через 12 месяцев.
create table if not exists public.coin_ledger (
  id            uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors (id) on delete cascade,
  amount        integer not null check (amount <> 0),
  reason        text not null check (reason in ('own_order', 'friend_order', 'event', 'spend', 'manual', 'expire')),
  order_id      uuid,
  note          text check (note is null or char_length(note) <= 200),
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists coin_ledger_amb_idx on public.coin_ledger (ambassador_id, created_at desc);

-- Заказ запоминает код амбассадора и сколько коинов потрачено.
alter table public.orders add column if not exists ref_code text check (ref_code is null or ref_code ~ '^[A-Z0-9]{4,12}$');
alter table public.orders add column if not exists coins_used integer not null default 0 check (coins_used >= 0);
alter table public.orders add column if not exists coins_awarded boolean not null default false;

-- 3. «Есть дельное предложение» — заявки о сотрудничестве.
create table if not exists public.partner_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  phone       text not null check (char_length(phone) between 5 and 32),
  company     text check (company is null or char_length(company) <= 120),
  message     text not null check (char_length(message) between 5 and 2000),
  status      text not null default 'new' check (status in ('new', 'in_progress', 'won', 'lost')),
  created_at  timestamptz not null default now()
);

alter table public.ambassadors      enable row level security;
alter table public.coin_ledger      enable row level security;
alter table public.partner_requests enable row level security;

-- 4. Строки контента: кружки-видео и настройки тайной страницы (раньше были только site и directions).
alter table public.content drop constraint if exists content_key_check;
alter table public.content add constraint content_key_check check (key in ('site', 'directions', 'circles', 'zvezda', 'photos', 'reviews'));

-- Куда прислать кассовый чек за сертификат: e-mail или SMS на номер покупателя.
alter table public.certificates add column if not exists receipt_via text not null default 'sms'
  check (receipt_via in ('email', 'sms'));

-- Личный кабинет: вход по номеру телефона с кодом из SMS.
-- Код храним только в виде хэша; попытки и частоту ограничивает сайт.
create table if not exists public.login_codes (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null check (char_length(phone) between 5 and 32),
  code_hash   text not null,
  channel     text not null check (channel in ('telegram', 'sms')),
  ip          text,
  attempts    integer not null default 0,
  used_at     timestamptz,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists login_codes_phone_idx on public.login_codes (phone, created_at desc);
create index if not exists login_codes_ip_idx on public.login_codes (ip, created_at desc);
create index if not exists login_codes_created_idx on public.login_codes (created_at desc);
alter table public.login_codes enable row level security;

-- Строки контента из админки: фото Арша и отзывы с площадок.
alter table public.content drop constraint if exists content_key_check;
alter table public.content add constraint content_key_check check (key in ('site', 'directions', 'circles', 'zvezda', 'photos', 'reviews'));

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

-- Новое название звезды «Ведущий» (владелец, 15.11.2026). Меняем и сохранённое в админке, если там осталось старое.
update public.content
   set data = jsonb_set(data, '{host,title}', to_jsonb('Ведущий вашего торжества'::text)),
       updated_at = now()
 where key = 'directions'
   and data #>> '{host,title}' = 'Ведущий на мероприятие';

-- Цена кейтеринга (владелец, 15.11.2026): «на любой бюджет — от 1 000 ₽ на человека».
-- Ставим её форматам кейтеринга, у которых в админке цена ещё пустая («Цена по запросу»). Свою цену не трогаем.
update public.content
   set data = jsonb_set(
         data,
         '{catering,page,formats}',
         (select jsonb_agg(
                   case when coalesce(f ->> 'price', '') = ''
                        then jsonb_set(f, '{price}', to_jsonb('от 1 000 ₽ на гостя — на любой бюджет'::text))
                        else f end
                   order by ord)
            from jsonb_array_elements(data #> '{catering,page,formats}') with ordinality as t(f, ord))),
       updated_at = now()
 where key = 'directions'
   and jsonb_typeof(data #> '{catering,page,formats}') = 'array'
   and jsonb_array_length(data #> '{catering,page,formats}') > 0
   and exists (select 1 from jsonb_array_elements(data #> '{catering,page,formats}') f where coalesce(f ->> 'price', '') = '');
