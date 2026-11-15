#!/usr/bin/env bash
# Jalankan Syaqil Laundry (aplikasi tunggal Laravel + React) dan bagikan lewat Cloudflare Quick Tunnel.
# Tanpa akun Cloudflare. URL publik berubah setiap kali tunnel dijalankan ulang.
set -euo pipefail

cd "$(dirname "$0")/.."

APP_PORT="${APP_PORT:-8000}"
DB_PORT="${DB_PORT:-3307}"
DB_DATADIR="${DB_DATADIR:-$HOME/.local/share/syaqil-mysql}"
DB_SOCKET="${DB_SOCKET:-/tmp/syaqil-share/mysql.sock}"
RUN_DIR="${RUN_DIR:-/tmp/syaqil-share}"
mkdir -p "$RUN_DIR"

log() { printf '[share] %s\n' "$*"; }
die() { printf '[share] ERROR: %s\n' "$*" >&2; exit 1; }

command -v php >/dev/null || die "php tidak ditemukan"
command -v cloudflared >/dev/null || die "cloudflared tidak ditemukan"
[ -f .env ] || die ".env tidak ada. Salin dari .env.example lalu isi kredensial."

# PDO MySQL kadang terpasang tetapi belum aktif di php.ini.
pdo_mysql_ok() {
  "$@" -r 'exit(in_array("mysql", PDO::getAvailableDrivers(), true) ? 0 : 1);' >/dev/null 2>&1
}
PHP=(php)
if ! pdo_mysql_ok php; then
  PHP=(php -d extension=pdo_mysql)
  pdo_mysql_ok "${PHP[@]}" || die "ekstensi pdo_mysql tidak tersedia untuk PHP CLI"
fi

port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1; }
wait_for() {
  local what=$1 tries=$2
  shift 2
  for _ in $(seq 1 "$tries"); do "$@" && return 0; sleep 1; done
  die "timeout menunggu $what"
}

STARTED_MYSQL=0
STARTED_PHP=0
TUNNEL_PID=""

cleanup() {
  if [ -n "$TUNNEL_PID" ] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
  if [ "$STARTED_PHP" = 1 ] && [ -f "$RUN_DIR/php.pid" ]; then
    PHP_PID=$(cat "$RUN_DIR/php.pid")
    pkill -TERM -P "$PHP_PID" 2>/dev/null || true
    kill "$PHP_PID" 2>/dev/null || true
  fi
  if [ "$STARTED_MYSQL" = 1 ] && [ -f "$RUN_DIR/mysql.pid" ]; then
    kill "$(cat "$RUN_DIR/mysql.pid")" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# 1. Database
if port_open "$DB_PORT"; then
  log "MySQL/MariaDB sudah berjalan di 127.0.0.1:$DB_PORT"
else
  command -v mariadbd >/dev/null || command -v mysqld >/dev/null || die "mariadbd/mysqld tidak ditemukan"
  [ -d "$DB_DATADIR" ] || die "datadir database tidak ada: $DB_DATADIR"
  BIN=$(command -v mariadbd || command -v mysqld)
  log "Menjalankan database dari $DB_DATADIR pada port $DB_PORT"
  nohup "$BIN" --datadir="$DB_DATADIR" --socket="$DB_SOCKET" \
    --pid-file="$RUN_DIR/mysql.pid" --port="$DB_PORT" --bind-address=127.0.0.1 \
    --skip-name-resolve --log-error="$RUN_DIR/mysql.err" \
    >"$RUN_DIR/mysql.out" 2>&1 &
  STARTED_MYSQL=1
  wait_for "database" 30 port_open "$DB_PORT"
fi

# 2. Build SPA terpadu ke public/
if [ ! -f public/index.html ]; then
  log "public/index.html belum ada, menjalankan npm run build"
  npm run build
fi

if port_open "$APP_PORT"; then
  log "Server aplikasi sudah berjalan di 127.0.0.1:$APP_PORT"
else
  log "Menjalankan server Laravel di 127.0.0.1:$APP_PORT"
  nohup "${PHP[@]}" artisan serve --host=127.0.0.1 --port="$APP_PORT" >"$RUN_DIR/php.log" 2>&1 &
  echo $! >"$RUN_DIR/php.pid"
  STARTED_PHP=1
  wait_for "server aplikasi" 20 curl -fsS -o /dev/null "http://127.0.0.1:$APP_PORT/" 2>/dev/null
fi

# 3. Cloudflare Quick Tunnel tunggal
: >"$RUN_DIR/tunnel.log"
log "Membuka tunnel publik..."
nohup cloudflared tunnel --url "http://127.0.0.1:$APP_PORT" --no-autoupdate >"$RUN_DIR/tunnel.log" 2>&1 &
TUNNEL_PID=$!
echo "$TUNNEL_PID" >"$RUN_DIR/tunnel.pid"

TUNNEL_URL=""
for _ in $(seq 1 45); do
  TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$RUN_DIR/tunnel.log" | head -1 || true)
  [ -n "$TUNNEL_URL" ] && break
  kill -0 "$TUNNEL_PID" 2>/dev/null || die "cloudflared berhenti. Lihat $RUN_DIR/tunnel.log"
  sleep 1
done
[ -n "$TUNNEL_URL" ] || die "URL tunnel tidak muncul. Lihat $RUN_DIR/tunnel.log"

printf '%s\n' "$TUNNEL_URL" >"$RUN_DIR/url.txt"
log "URL Aplikasi : $TUNNEL_URL"
log "Struk Publik : $TUNNEL_URL/receipt/<token>"
log "Log          : $RUN_DIR/{php.log,tunnel.log,mysql.err}"
log "Tekan Ctrl+C untuk menghentikan layanan yang dijalankan skrip ini."

wait "$TUNNEL_PID"
