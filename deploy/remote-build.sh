#!/usr/bin/env bash
# Сборка и перезапуск на сервере. Вызывается из deploy.sh, вручную запускать не нужно.
set -euo pipefail
APP=/srv/arshparty/app
step() { printf '\n\033[1;33m▶ %s\033[0m\n' "$1"; }

chown -R arsh:arsh "$APP"
[ -f "$APP/.env.production.local" ] && chmod 640 "$APP/.env.production.local"

step "База: применяю схему"
PGOPTIONS='--client-min-messages=warning' sudo -u postgres psql -q -v ON_ERROR_STOP=1 -d arsh < "$APP/supabase/schema.sql"
sudo -u postgres psql -q -d arsh -c "grant select, insert, update, delete on all tables in schema public to service_role; grant usage, select on all sequences in schema public to service_role; notify pgrst, 'reload schema';"

step "Зависимости"
sudo -u arsh -H bash -c "cd $APP && npm ci --no-audit --no-fund --loglevel=error"

step "Сборка сайта (1–3 минуты)"
sudo -u arsh -H bash -c "cd $APP && set -a && . /etc/arshparty/server.env && set +a && npm run build 2>&1 | tail -25"

step "Перезапуск"
systemctl restart arshparty
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/; then
    printf '\n\033[1;32m✓ Сайт обновлён и отвечает\033[0m\n'
    exit 0
  fi
  sleep 1
done
echo "✗ Сайт не ответил за 30 секунд. Последние строки журнала:"
journalctl -u arshparty -n 40 --no-pager
exit 1
