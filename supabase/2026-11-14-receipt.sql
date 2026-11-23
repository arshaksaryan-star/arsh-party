-- Куда прислать кассовый чек за сертификат: e-mail или SMS на номер покупателя.
alter table public.certificates add column if not exists receipt_via text not null default 'sms'
  check (receipt_via in ('email', 'sms'));
