-- Новое название звезды «Ведущий» (владелец, 15.11.2026). Меняем и сохранённое в админке, если там осталось старое.
update public.content
   set data = jsonb_set(data, '{host,title}', to_jsonb('Ведущий вашего торжества'::text)),
       updated_at = now()
 where key = 'directions'
   and data #>> '{host,title}' = 'Ведущий на мероприятие';
