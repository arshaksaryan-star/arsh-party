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
