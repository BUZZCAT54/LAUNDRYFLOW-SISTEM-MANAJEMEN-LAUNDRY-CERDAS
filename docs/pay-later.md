# Bayar nanti dan penyederhanaan pelanggan

Kasir dapat memilih **Bayar nanti**. Pesanan tetap memiliki status proses cucian (Diterima, Diproses, Selesai, Diambil), sementara status pembayaran menampilkan **Belum bayar** sampai dilunasi.

Buka detail pesanan atau tombol **Catat pelunasan** di riwayat nota. Pilih Tunai, QRIS, atau Transfer. Pembayaran non-tunai memerlukan konfigurasi merchant dan konfirmasi dana diterima. Pelunasan mengubah nota yang sama; pengiriman ulang tidak membuat pembayaran kedua.

Nota cetak/PDF menampilkan status dan sisa tagihan. Pendapatan pada dashboard dan laporan hanya menghitung nota yang sudah lunas, dikelompokkan menurut tanggal pesanan. Ini bukan laporan arus kas berdasarkan tanggal pelunasan.

## Pembaruan database Kasir yang sudah ada

Jalankan sebelum memakai Bayar nanti:

```sh
php -d extension=pdo_mysql scripts/migrate-pay-later.php
```

Migrasi idempoten menambahkan nilai `later` pada enum metode pembayaran, tanpa menghapus data lama. Instalasi baru melalui `scripts/setup.php` otomatis menyertakannya. Migrasi lokal demo sudah dijalankan; deployment lain tetap perlu menjalankannya sendiri.

## Pelanggan

Form, daftar, profil, dan impor/ekspor pelanggan tidak lagi menawarkan alamat, kategori Member/Reguler, loyalty, atau status Aktif/Tidak Aktif. Data alamat lama tetap disimpan untuk menghindari penghapusan riwayat. Diskon checkout dan metode bayar pengeluaran Owner sudah dihapus sebelumnya. Tidak ada pilihan parfum dalam versi web ini.

Owner masih memakai data contoh terpisah; transaksi Kasir belum tersinkron ke Owner. Perubahan web ini belum disalin ke prototype Figma karena batas pemakaian konektor Starter.
