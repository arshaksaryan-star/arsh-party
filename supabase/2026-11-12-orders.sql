-- Arsh Party: заказы с мангала — доставка. Выполнить один раз: Supabase → SQL Editor → вставить → Run.

-- Доставка в заказах (добавлено 12.11.2026) ---------------------------------
alter table public.orders add column if not exists delivery_zone text
  check (delivery_zone is null or delivery_zone in ('near', 'far', 'outside', 'pickup'));
alter table public.orders add column if not exists delivery_fee integer check (delivery_fee is null or delivery_fee >= 0);
alter table public.orders add column if not exists subtotal integer check (subtotal is null or subtotal >= 0);
