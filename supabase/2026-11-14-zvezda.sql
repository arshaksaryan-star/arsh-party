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
