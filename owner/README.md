# Syaqil Laundry Owner — Phase 00

Prototipe **frontend UI/UX** terpisah dari aplikasi kasir. Fase ini hanya menyediakan shell aplikasi Owner dan fondasi komponen; seluruh data pada contoh Dashboard bersifat statis. Belum ada backend, database, API, login, atau Dashboard Owner lengkap.

## Menjalankan

Dari folder `outputs/syaqil-laundry`:

```bash
npm install
npm run owner:dev
```

Buka `http://127.0.0.1:5174/#dashboard`. Untuk memeriksa build produksi, jalankan `npm run owner:build`; hasilnya di `dist-owner/`.

## Struktur

- `src/tokens.css`: warna, tipografi dasar, ruang, radius, dan bayangan Owner.
- `src/owner.css`: layout dan gaya responsif shell serta komponen.
- `src/ui.jsx`: `Button`, `Input`, `Select`, `Textarea`, `Card`, `DataTable`, `StatusBadge`, `Modal`, `Drawer`, `EmptyState`, dan `LoadingState`.
- `src/OwnerApp.jsx`: sidebar, topbar, navigasi, contoh fondasi pada Dashboard, dan placeholder modul Owner berikutnya.
- `public/assets/`: logo dan ilustrasi sidebar resolusi tinggi dari aset Syaqil Laundry yang sudah ada.

Navigasi menggunakan hash lokal agar seluruh menu dapat ditinjau tanpa implementasi modul. Rute selain Dashboard menampilkan placeholder Phase 00. Sidebar lebar pada desktop, ringkas pada tablet, dan menjadi panel geser pada layar kecil.

Saat fase berikutnya dimulai, bangun layar Owner di dalam shell ini dan impor komponen dari `src/ui.jsx`; jangan menghubungkannya ke aplikasi kasir atau data nyata sampai fase integrasi disetujui.
