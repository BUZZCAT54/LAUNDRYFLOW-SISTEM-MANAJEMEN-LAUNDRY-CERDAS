<?php
require_once __DIR__.'/../server/config.php';
if(PHP_SAPI !== 'cli') exit('CLI only');
$column=db()->query("SHOW COLUMNS FROM orders LIKE 'method'")->fetch();
if (!$column) throw new RuntimeException('Tabel orders belum tersedia.');
if (!str_contains($column['Type'], "'later'")) db()->exec("ALTER TABLE orders MODIFY method ENUM('cash','qris','transfer','later') NOT NULL");
echo "Metode bayar nanti siap. Data lama dipertahankan.\n";
