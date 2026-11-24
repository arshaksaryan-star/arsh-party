#!/usr/bin/env bash
# Публикация сайта с Mac на сервер одной командой:
#   ./deploy/deploy.sh
# Отправляет код (без node_modules и .next), настройки из .env.local (кроме ключей Supabase),
# собирает сайт на сервере и перезапускает его. Старая версия работает, пока идёт сборка.
set -euo pipefail
SERVER="${SERVER:-root@185.20.227.209}"
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then echo "Нет .env.local — запустите из папки arsh-party"; exit 1; fi

echo "▶ Отправляю код на $SERVER"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude '.env*' --exclude .git \
  --exclude migration --exclude '*.tsbuildinfo' --exclude .DS_Store \
  ./ "$SERVER:/srv/arshparty/app/"

echo "▶ Отправляю настройки"
tmp=$(mktemp)
grep -v -E '^\s*(SUPABASE_|STORAGE_DIR)' .env.local > "$tmp"
scp -q "$tmp" "$SERVER:/srv/arshparty/app/.env.production.local"
rm -f "$tmp"

ssh "$SERVER" 'bash /srv/arshparty/app/deploy/remote-build.sh'
