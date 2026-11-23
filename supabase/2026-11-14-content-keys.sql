-- Строки контента из админки: фото Арша и отзывы с площадок.
alter table public.content drop constraint if exists content_key_check;
alter table public.content add constraint content_key_check check (key in ('site', 'directions', 'circles', 'zvezda', 'photos', 'reviews'));
