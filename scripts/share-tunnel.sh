#!/usr/bin/env bash
# Jalankan Syaqil Laundry dari komputer ini dan bagikan lewat Cloudflare Quick Tunnel.
# Tanpa akun Cloudflare. URL publik berubah setiap kali tunnel dijalankan ulang.
set -euo pipefail

cd "$(dirname "$0")/.."

PHP_PORT="${PHP_PORT:-8080}"
OWNER_PORT="${OWNER_PORT:-8081}"
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
STARTED_OWNER=0
TUNNEL_PID=""
OWNER_TUNNEL_PID=""

cleanup() {
  if [ -n "$TUNNEL_PID" ] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
  if [ -n "$OWNER_TUNNEL_PID" ] && kill -0 "$OWNER_TUNNEL_PID" 2>/dev/null; then
    kill "$OWNER_TUNNEL_PID" 2>/dev/null || true
  fi
  if [ "$STARTED_OWNER" = 1 ] && [ -f "$RUN_DIR/owner-php.pid" ]; then
    OWNER_PID=$(cat "$RUN_DIR/owner-php.pid")
    pkill -TERM -P "$OWNER_PID" 2>/dev/null || true
    kill "$OWNER_PID" 2>/dev/null || true
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
if port_open 3306; then
  log "MySQL/MariaDB sudah berjalan di 127.0.0.1:3306"
else
  command -v mariadbd >/dev/null || command -v mysqld >/dev/null || die "mariadbd/mysqld tidak ditemukan"
  [ -d "$DB_DATADIR" ] || die "datadir database tidak ada: $DB_DATADIR"
  BIN=$(command -v mariadbd || command -v mysqld)
  log "Menjalankan database dari $DB_DATADIR"
  nohup "$BIN" --datadir="$DB_DATADIR" --socket="$DB_SOCKET" \
    --pid-file="$RUN_DIR/mysql.pid" --port=3306 --bind-address=127.0.0.1 \
    --skip-name-resolve --log-error="$RUN_DIR/mysql.err" \
    >"$RUN_DIR/mysql.out" 2>&1 &
  STARTED_MYSQL=1
  wait_for "database" 30 port_open 3306
fi

# 2. Build frontend kasir + owner
if [ ! -f dist/index.html ]; then
  log "dist/ belum ada, menjalankan npm run build"
  npm run build
fi
if [ ! -f dist-owner/index.html ]; then
  log "dist-owner/ belum ada, menjalankan npm run owner:build"
  npm run owner:build
fi

if port_open "$PHP_PORT"; then
  log "Server kasir sudah berjalan di 127.0.0.1:$PHP_PORT"
else
  log "Menjalankan server kasir di 127.0.0.1:$PHP_PORT"
  PHP_CLI_SERVER_WORKERS=4 nohup "${PHP[@]}" -S "127.0.0.1:$PHP_PORT" \
    -t public public/index.php >"$RUN_DIR/php.log" 2>&1 &
  echo $! >"$RUN_DIR/php.pid"
  STARTED_PHP=1
  wait_for "server kasir" 20 curl -fsS -o /dev/null "http://127.0.0.1:$PHP_PORT/" 2>/dev/null
fi

if port_open "$OWNER_PORT"; then
  log "Server owner sudah berjalan di 127.0.0.1:$OWNER_PORT"
else
  log "Menjalankan server owner di 127.0.0.1:$OWNER_PORT"
  PHP_CLI_SERVER_WORKERS=2 nohup "${PHP[@]}" -S "127.0.0.1:$OWNER_PORT" \
    -t dist-owner >"$RUN_DIR/owner-php.log" 2>&1 &
  echo $! >"$RUN_DIR/owner-php.pid"
  STARTED_OWNER=1
  wait_for "server owner" 20 curl -fsS -o /dev/null "http://127.0.0.1:$OWNER_PORT/" 2>/dev/null
fi

# 3. Dua Cloudflare Quick Tunnel
open_tunnel() {
  local target=$1 logfile=$2 pidfile=$3 label=$4
  : >"$logfile"
  nohup cloudflared tunnel --url "$target" --no-autoupdate >"$logfile" 2>&1 &
  LAST_TUNNEL_PID=$!
  echo "$LAST_TUNNEL_PID" >"$pidfile"
  TUNNEL_URL=""
  for _ in $(seq 1 45); do
    TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$logfile" | head -1 || true)
    [ -n "$TUNNEL_URL" ] && break
    kill -0 "$LAST_TUNNEL_PID" 2>/dev/null || die "cloudflared $label berhenti. Lihat $logfile"
    sleep 1
  done
  [ -n "$TUNNEL_URL" ] || die "URL tunnel $label tidak muncul. Lihat $logfile"
}

log "Membuka tunnel kasir..."
open_tunnel "http://127.0.0.1:$PHP_PORT" "$RUN_DIR/tunnel.log" "$RUN_DIR/tunnel.pid" "kasir"
TUNNEL_PID=$LAST_TUNNEL_PID
KASIR_URL=$TUNNEL_URL

log "Membuka tunnel owner..."
open_tunnel "http://127.0.0.1:$OWNER_PORT" "$RUN_DIR/owner-tunnel.log" "$RUN_DIR/owner-tunnel.pid" "owner"
OWNER_TUNNEL_PID=$LAST_TUNNEL_PID
OWNER_URL=$TUNNEL_URL

printf '%s\n' "$KASIR_URL" >"$RUN_DIR/url.txt"
printf '%s\n' "$OWNER_URL" >"$RUN_DIR/owner-url.txt"
log "Kasir : $KASIR_URL"
log "Owner : $OWNER_URL"
log "Log   : $RUN_DIR/{php.log,owner-php.log,tunnel.log,owner-tunnel.log,mysql.err}"
log "Tekan Ctrl+C untuk menghentikan layanan yang dijalankan skrip ini."

wait "$TUNNEL_PID" "$OWNER_TUNNEL_PID"
