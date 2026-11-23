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
