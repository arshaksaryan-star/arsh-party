-- Новые разделы меню мангала: «Курица» и «Рыба».
-- Выполнить один раз в Supabase → SQL Editor. Повторный запуск ничего не ломает.
alter table public.menu_items drop constraint if exists menu_items_category_check;
alter table public.menu_items add constraint menu_items_category_check
  check (category in ('shashlik', 'chicken', 'lulya', 'fish', 'vegetables', 'sides', 'sauces', 'sets'));
