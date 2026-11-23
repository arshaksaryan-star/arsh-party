#!/usr/bin/env bash
# Первичная настройка сервера Arsh Party (Ubuntu 24.04/26.04). Запускается с Mac:
#   scp deploy/setup-server.sh root@IP:/root/ && ssh root@IP 'bash /root/setup-server.sh'
# Повторный запуск безопасен: сделанное пропускается.
# Ставит: Node.js, PostgreSQL, PostgREST, nginx, файрвол, swap, ночные копии базы.
# Пароли генерирует сам и хранит только на сервере (/etc/arshparty/). Ничего секретного на экран не выводит.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

POSTGREST_VERSION="v16.5"
ROOT=/srv/arshparty
APP=$ROOT/app
STORAGE=$ROOT/storage
ETC=/etc/arshparty

trap 'echo "✗ Настройка остановилась на строке $LINENO — пришлите скриншот"' ERR
step() { printf '\n\033[1;33m▶ %s\033[0m\n' "$1"; }

step "1/9 Обновляю систему и ставлю пакеты (несколько минут)"
apt-get update -qq
apt-get -y -qq upgrade
apt-get install -y -qq postgresql nginx curl xz-utils rsync ufw certbot python3-certbot-nginx ca-certificates openssl ffmpeg >/dev/null

step "2/9 Node.js"
need_node=1
if command -v node >/dev/null 2>&1; then
  major=$(node -p 'process.versions.node.split(".")[0]')
  [ "$major" -ge 20 ] && need_node=0
fi
if [ "$need_node" = 1 ]; then
  apt-get install -y -qq nodejs npm >/dev/null || true
  if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
    # из официального архива nodejs.org (22 LTS)
    NODE_VER=$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | grep -o 'node-v22[^ ]*-linux-x64.tar.xz' | head -1)
    curl -fsSL "https://nodejs.org/dist/latest-v22.x/$NODE_VER" -o /tmp/node.tar.xz
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1
    rm /tmp/node.tar.xz
  fi
fi
echo "node $(node -v), npm $(npm -v)"

step "3/9 Файл подкачки 2 ГБ (чтобы сборке сайта хватало памяти)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

step "4/9 Пользователь и папки"
id arsh >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/arsh --shell /usr/sbin/nologin arsh
mkdir -p "$APP" "$STORAGE/media" "$STORAGE/review-uploads" "$ETC" /var/backups/arshparty
chown -R arsh:arsh "$ROOT"
chmod 750 "$ROOT"

step "5/9 База PostgreSQL"
if [ ! -s "$ETC/db.pass" ] || ! grep -qE '^[A-Za-z0-9]{20,}$' "$ETC/db.pass"; then
  openssl rand -hex 20 > "$ETC/db.pass"
  chmod 600 "$ETC/db.pass"
fi
DBPASS=$(cat "$ETC/db.pass")
sudo -u postgres psql -q -v ON_ERROR_STOP=1 <<SQL
do \$\$ begin
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit;
  end if;
end \$\$;
alter role authenticator password '$DBPASS';
grant service_role to authenticator;
SQL
sudo -u postgres psql -tAc "select 1 from pg_database where datname='arsh'" | grep -q 1 || sudo -u postgres createdb arsh
sudo -u postgres psql -q -d arsh -c "grant usage on schema public to service_role; alter default privileges in schema public grant select, insert, update, delete on tables to service_role; alter default privileges in schema public grant usage, select on sequences to service_role;"

step "6/9 PostgREST $POSTGREST_VERSION (REST к базе, только внутри сервера)"
if ! /usr/local/bin/postgrest --version 2>/dev/null | grep -q "${POSTGREST_VERSION#v}"; then
  curl -fsSL "https://github.com/PostgREST/postgrest/releases/download/${POSTGREST_VERSION}/postgrest-${POSTGREST_VERSION}-linux-static-x86-64.tar.xz" -o /tmp/postgrest.tar.xz
  tar -xJf /tmp/postgrest.tar.xz -C /usr/local/bin postgrest
  rm /tmp/postgrest.tar.xz
fi
cat > "$ETC/postgrest.conf" <<CONF
db-uri = "postgres://authenticator:$DBPASS@127.0.0.1:5432/arsh"
db-schemas = "public"
db-anon-role = "service_role"
server-host = "127.0.0.1"
server-port = 3001
CONF
chmod 640 "$ETC/postgrest.conf"; chown root:arsh "$ETC/postgrest.conf"
cat > /etc/systemd/system/postgrest.service <<UNIT
[Unit]
Description=PostgREST for Arsh Party
After=postgresql.service
Requires=postgresql.service

[Service]
User=arsh
ExecStart=/usr/local/bin/postgrest $ETC/postgrest.conf
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

step "7/9 Настройки сайта и служба arshparty"
if [ ! -f "$ETC/server.env" ]; then
  FILES_SECRET=$(openssl rand -hex 24)
  cat > "$ETC/server.env" <<ENV
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
POSTGREST_URL=http://127.0.0.1:3001
STORAGE_DIR=$STORAGE
FILES_SECRET=$FILES_SECRET
NEXT_TELEMETRY_DISABLED=1
ENV
fi
chmod 640 "$ETC/server.env"; chown root:arsh "$ETC/server.env"
NODE_BIN=$(command -v node)
cat > /etc/systemd/system/arshparty.service <<UNIT
[Unit]
Description=Arsh Party site (Next.js)
After=network.target postgrest.service

[Service]
User=arsh
WorkingDirectory=$APP
EnvironmentFile=$ETC/server.env
ExecStart=$NODE_BIN $APP/node_modules/next/dist/bin/next start -p 3000 -H 127.0.0.1
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now postgrest >/dev/null
systemctl enable arshparty >/dev/null

step "8/9 nginx и файрвол"
if grep -q "managed by Certbot" /etc/nginx/sites-available/arshparty 2>/dev/null; then
  echo "nginx уже с HTTPS — настройки не трогаю"
  sed -i 's/client_max_body_size [0-9]*m;/client_max_body_size 300m;/' /etc/nginx/sites-available/arshparty
else
cat > /etc/nginx/sites-available/arshparty <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name arshparty.ru www.arshparty.ru new.arshparty.ru _;

    # фото и видео к отзывам до 50 МБ, видео-приветствие Arsh Live до 300 МБ
    client_max_body_size 300m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_read_timeout 300s;
    }
}
NGINX
fi
ln -sf /etc/nginx/sites-available/arshparty /etc/nginx/sites-enabled/arshparty
rm -f /etc/nginx/sites-enabled/default
nginx -t -q && systemctl reload nginx
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null

step "9/9 Ночная копия базы (03:30, хранится 14 дней)"
cat > /etc/cron.d/arshparty-backup <<'CRON'
30 3 * * * postgres pg_dump -Fc arsh > /var/backups/arshparty/arsh-$(date +\%F).dump && find /var/backups/arshparty -name 'arsh-*.dump' -mtime +14 -delete
CRON
chown postgres:postgres /var/backups/arshparty

printf '\n\033[1;32m✓ Сервер готов. Дальше на Mac: ./deploy/deploy.sh\033[0m\n'
