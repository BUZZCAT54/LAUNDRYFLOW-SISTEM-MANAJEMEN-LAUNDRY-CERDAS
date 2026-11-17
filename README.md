# Syaqil Laundry — Kasir & Owner (Unified Monolith Architecture)

Aplikasi manajemen laundry terpadu untuk **Syaqil Laundry Ekspres** yang menggabungkan **Workspace Kasir (Front-Office)** dan **Workspace Owner (Back-Office)** dalam satu aplikasi web (Single-Origin React SPA + Laravel 10 API) dengan satu basis data MySQL/MariaDB (`syaqil_laundry`).

---

## Ringkasan Teknis

- **Backend:** PHP `^8.1`, Laravel `^10.10`, Laravel Sanctum `^3.3` (autentikasi sesi + CSRF + RBAC `cashier` & `owner`), zona waktu default `Asia/Jakarta`
- **Frontend:** React `^19.0.0`, Vite `^6.1.0`, Lucide React, jsPDF `^4.2.1` (cetak PDF 80mm)
- **Database:** MySQL / MariaDB (`syaqil_laundry`)

---

## Akun Bawaan (Seeder)

- **URL Aplikasi:** `http://127.0.0.1:8000/` (otomatis mengarahkan sesuai role akun setelah login)
- **Owner (`role: owner`):**
  - Username: `owner`
  - Kata Sandi: `OwnerSyaqil!2026`
- **Kasir (`role: cashier`):**
  - Username: `kasir`
  - Kata Sandi: `KasirSyaqil!2026`

> **Catatan Keamanan:** Ganti kata sandi bawaan dan nonaktifkan tombol *Masuk Cepat* di `src/UnifiedLogin.jsx` sebelum men-deploy ke lingkungan produksi.

---

## Instalasi & Menjalankan Secara Lokal

### Prasyarat
- PHP >= 8.1 dengan ekstensi `pdo_mysql` aktif
- Composer & Node.js + npm
- Server MySQL atau MariaDB

### 1. Setup Awal (Pertama Kali)

```sh
composer install
npm install
cp .env.example .env
php artisan key:generate
```

Sesuaikan konfigurasi `.env` (koneksi database `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, serta `PUBLIC_RECEIPT_BASE_URL` dan `CORS_ALLOWED_ORIGINS` jika dibutuhkan), lalu jalankan migrasi & seeder:

```sh
php artisan migrate --seed
```

### 2. Build Frontend & Jalankan Server

1. **Build aset React SPA ke `public/`** (wajib dijalankan setiap mengubah kode di `src/`):
   ```sh
   npm run build
   ```
2. **Jalankan server Laravel (Port `8000`):**
   ```sh
   php artisan serve --host=127.0.0.1 --port=8000
   ```
   - Di Windows/Laragon dapat memakai `start-all.bat` (dan `stop-all.bat` untuk menghentikan server).
   - Untuk pengembangan frontend dengan Vite HMR (`127.0.0.1:5173` dengan proxy `/api` ke `127.0.0.1:8000`):
     ```sh
     npm run dev
     ```
   - Untuk membagikan server lokal lewat Cloudflare Quick Tunnel (Linux/macOS):
     ```sh
     bash scripts/share-tunnel.sh
     ```

---

## Fitur Utama

### Workspace Kasir (Front-Office)
- **Kasir / Transaksi Baru:** pilih/tambah pelanggan, pilih layanan (`Reguler`, `Ekspres 1 Hari`, `Ekspres Jam`, atau layanan aktif lain), input berat/jumlah & catatan, kalkulasi subtotal/total otoritatif di backend, idempotency `request_key`, serta pratinjau struk.
- **Metode Pembayaran:** dukungan **Tunai**, **QRIS**, **Transfer Bank**, serta **Bayar Nanti** (`Belum Bayar`) dengan fitur pelunasan saat cucian diambil.
- **Dashboard Kasir:** ringkasan harian, grafik pendapatan, layanan terpopuler, distribusi status pesanan (donut chart), dan daftar pesanan terbaru.
- **Pesanan & Riwayat Nota:** pembaruan progres status berurutan (`Diterima` -> `Diproses` -> `Selesai` -> `Diambil`), detail pesanan, modal cetak ulang struk thermal 80mm, unduh PDF, dan ekspor Excel (`.xlsx`).
- **Pelanggan:** kelola data pelanggan dengan normalisasi nomor WhatsApp Indonesia (`62xxx`) dan riwayat transaksi.
- **Laporan Usaha:** filter rentang tanggal/pembanding periode, grafik pendapatan, layanan terlaris, distribusi metode pembayaran & status pesanan, serta ringkasan harian.

### Workspace Owner (Back-Office)
- **Dashboard Owner:** ringkasan metrik operasional, tren pendapatan, ranking layanan, distribusi status cucian, dan aktivitas terkini.
- **Pelanggan:** manajemen data pelanggan terintegrasi, termasuk pencarian, pengelolaan profil, dan riwayat transaksi.
- **Riwayat Nota:** filter periode/metode/status dengan warna lencana per status dan penghitung cetak ulang (`Cetak N×`), preview nota 80mm, cetak ulang, unduh PDF, dan log aktivitas nota.
- **Layanan & Harga:** CRUD master layanan, aktif/nonaktif layanan, serta pencatatan riwayat perubahan tarif (`price_histories`).
- **Karyawan:** kelola akun `Owner` & `Kasir`, aktif/nonaktif akun (dengan proteksi agar owner aktif tunggal tidak dapat dinonaktifkan), dan reset password karyawan.
- **Koreksi Transaksi:** pengajuan koreksi/pembatalan nota beserta alur persetujuan (`Diproses`, disetujui, atau ditolak).
- **Pengeluaran:** pencatatan biaya operasional per kategori dan rentang tanggal.
- **Laporan & Analitik Keuangan:** ringkasan keuangan, analitik pelanggan/layanan, tren pendapatan per metode pembayaran, komposisi biaya, laba bersih, dan ekspor laporan.
- **Pengaturan Usaha:** profil toko & upload logo, jam operasional, konfigurasi rekening bank & gambar QRIS, format nota thermal (`58mm`/`80mm`), zona waktu, konfigurasi notifikasi & HTTP WhatsApp Gateway, serta backup/restore pengaturan JSON.

### Nota Digital Publik & WhatsApp
- **Tautan Nota Publik (`/nota/{token}` & `/api/public/receipt/{token}`):** pelanggan dapat membuka nota secara langsung tanpa login; endpoint publik menyaring field internal sensitif.
- **WhatsApp Click-to-Chat & Gateway:** pembuatan tautan `wa.me` berisi ringkasan pesanan dan tautan nota publik (termasuk fallback aman untuk nomor non-standar atau mode gateway HTTP Bearer).

---

## Pengujian Otomatis

Seluruh pengujian frontend dan integrasi backend dapat dijalankan lewat skrip npm:

```sh
# Menjalankan semua pengujian frontend + 6 suite integrasi backend
npm run test:all
```

> **Perhatian:** Suite pengujian PHP menggunakan konfigurasi database pada `.env` dan membuat/mengubah data uji selama proses berjalan. Cadangkan database terlebih dahulu jika sedang memakai data penting.

### Pengujian Backend (PHP Suites — 126 Skenario)
- `npm run test:cashier` — `php tests/suites/test_cashier_orders.php` (18 lulus)
- `npm run test:whatsapp` — `php tests/suites/test_whatsapp_flow_comprehensive.php` (36 lulus)
- `npm run test:owner` — `php tests/suites/test_owner_management.php` (24 lulus)
- `npm run test:auth` — `php tests/suites/test_auth_rbac.php` (12 lulus)
- `npm run test:payments` — `php tests/suites/test_payments_e2e.php` (15 lulus)
- `npm run test:internet` — `php tests/suites/test_public_receipt_internet.php` (21 lulus)
- Tambahan di `tests/suites/`: `test_whatsapp_receipts.php`

### Pengujian Frontend (JavaScript — `npm run test:js`)
- **Utilitas Kasir (`tests/js/*.mjs`, 10 pemeriksaan):** `connection.mjs`, `discount.mjs`, `insights.mjs`, `payment.mjs`, `reconnection.mjs`, `reference-utils.mjs`, `reports.mjs`
- **Modul Owner (`tests/owner/*.test.mjs`, 20 unit test):** `data.test.mjs`, `finance.test.mjs`, `management.test.mjs`, `settings.test.mjs`

---

## Struktur Direktori

```text
app/                 Backend Laravel (Controllers, Models, Middleware, Services)
bootstrap/           Bootstrap kernel Laravel
config/              Konfigurasi Laravel (auth, cors, database, sanctum, dll)
database/            Migrasi skema dan seeder database (syaqil_laundry)
docs/                Dokumentasi arsitektur, alur sistem, wireframe, dan aset
public/              Web root Laravel & hasil build Vite (index.html, assets/)
resources/           Blade view Laravel (public_receipt.blade.php, welcome.blade.php)
routes/              Definisi rute API (/api/*) dan rute web SPA + publik (/nota/{token})
scripts/             Skrip utilitas lokal (share-tunnel.sh untuk Cloudflare Tunnel)
src/                 Source kode React SPA Kasir dan Workspace Owner (src/owner/)
tests/suites/        Suite pengujian integrasi PHP backend
tests/js/            Pengujian unit utilitas frontend Kasir
tests/owner/         Pengujian unit modul Owner (node --test)
start-all.bat        Peluncur cepat Windows untuk server port 8000
stop-all.bat         Penghenti proses server lokal Windows
vite.config.js       Konfigurasi build Vite (outDir: public) & dev proxy API
```

---

## Backup Database

Lakukan pencadangan database secara berkala dan sebelum menjalankan migrasi:

```sh
mysqldump -u syaqil -p --single-transaction --default-character-set=utf8mb4 syaqil_laundry > backup-syaqil.sql
```

Simpan file hasil backup dan `.env` di luar folder web publik (`public/`), serta uji proses pemulihan (*restore*) pada database terpisah secara berkala.

---

## Keputusan Desain & Dokumentasi Tambahan

- **Identitas Visual:** Warna utama biru electric (`#0755ee` / `#0343be`) untuk navigasi dan aksi utama, berpadu dengan aksen lime (`#d4ff3d` / `#dcff27`) untuk penekanan status/total. Tipografi menggunakan **Inter** untuk form dan tabel, serta **Archivo Black** dan **Anton** untuk judul/banner.
- **Dokumentasi Terkait:**
  - [Penjelasan Alur Sistem & Diagram](docs/DOKUMEN_PENJELASAN_ALUR_SISTEM.md)
  - [Catatan Aset HD dan Laporan](docs/hd-assets-and-reports.md)
  - Panduan topik spesifik lainnya tersedia di folder `docs/` (`pay-later.md`, `loading-and-reconnection.md`, `page-refresh.md`, `cashier-orders-refresh.md`, dll).
