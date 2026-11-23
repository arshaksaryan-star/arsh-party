#!/usr/bin/env bash
# Перенос данных на сервер (один раз, после ./deploy/deploy.sh). Запуск на Mac:
#   ./deploy/import-data.sh
# Берёт папку migration/ (её делает scripts/export-supabase.mjs), загружает файлы и таблицы на сервер,
# затем заводит 14 блюд с фото (уже существующие по названию не дублирует).
set -euo pipefail
SERVER="${SERVER:-root@185.20.227.209}"
cd "$(dirname "$0")/.."

if [ -d migration/db ]; then
  echo "▶ Отправляю данные"
  ssh "$SERVER" 'mkdir -p /srv/arshparty/migration'
  rsync -az migration/ "$SERVER:/srv/arshparty/migration/"
  ssh "$SERVER" 'bash -s' <<'REMOTE'
set -euo pipefail
M=/srv/arshparty/migration
if [ -d "$M/files" ]; then
  cp -r "$M/files/." /srv/arshparty/storage/
  chown -R arsh:arsh /srv/arshparty/storage
fi
# у postgres нет доступа к /srv/arshparty — копируем таблицы туда, где он может читать
IMPORT=/var/lib/postgresql/arsh-import
rm -rf "$IMPORT" && cp -r "$M/db" "$IMPORT" && chown -R postgres:postgres "$IMPORT"
for table in content menu_items events site_reviews orders leads; do
  f="$IMPORT/$table.json"
  [ -f "$f" ] || continue
  sudo -u postgres psql -q -v ON_ERROR_STOP=1 -d arsh <<SQL
begin;
delete from public.$table;
insert into public.$table overriding system value
  select * from json_populate_recordset(null::public.$table, pg_read_file('$f')::json);
commit;
SQL
  echo "  ✓ $table: $(sudo -u postgres psql -tA -d arsh -c "select count(*) from public.$table")"
done
# нумерация заказов, заявок и отзывов продолжается с последнего номера
sudo -u postgres psql -q -d arsh <<'SQL'
select setval(pg_get_serial_sequence('public.orders', 'number'), coalesce((select max(number) from public.orders), 0) + 1, false);
select setval(pg_get_serial_sequence('public.leads', 'number'), coalesce((select max(number) from public.leads), 0) + 1, false);
select setval(pg_get_serial_sequence('public.site_reviews', 'number'), coalesce((select max(number) from public.site_reviews), 0) + 1, false);
SQL
rm -rf "$IMPORT"
REMOTE
else
  echo "Папки migration/ нет — переношу только блюда"
fi

echo "▶ Блюда с фото"
ssh "$SERVER" "cd /srv/arshparty/app && sudo -u arsh -H bash -c 'set -a && . /etc/arshparty/server.env && set +a && node scripts/import-dishes.mjs'"
ssh "$SERVER" 'systemctl restart arshparty'
echo "✓ Готово"
