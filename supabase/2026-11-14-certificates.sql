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
