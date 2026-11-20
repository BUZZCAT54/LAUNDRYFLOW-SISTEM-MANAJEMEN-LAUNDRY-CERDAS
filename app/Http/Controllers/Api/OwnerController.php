<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountActivity;
use App\Models\BusinessSetting;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\Order;
use App\Models\OrderCorrection;
use App\Models\OrderItem;
use App\Models\PriceHistory;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use InvalidArgumentException;

class OwnerController extends Controller
{
    /**
     * Memuat seluruh data master, operasional, dan analitik untuk workspace Owner.
     */
    public function bootstrap(): JsonResponse
    {
        // 1. Data Pesanan & Nota Lengkap
        $orders = Order::with(['items', 'history.user', 'latestNotification', 'cashier'])
            ->orderByDesc('id')
            ->get();

        $reprintCounts = AccountActivity::whereNotNull('order_id')
            ->where('type', 'Struk Dicetak Ulang')
            ->selectRaw('order_id, COUNT(*) as cnt')
            ->groupBy('order_id')
            ->pluck('cnt', 'order_id');

        $receipts = $orders->map(fn(Order $order) => $this->formatReceipt(
            $order,
            (int)($reprintCounts[$order->id] ?? 0)
        ))->values()->all();

        // 2. Data Pelanggan Lengkap dengan Agregat
        $customers = Customer::withCount('orders as order_count')
            ->withSum('orders as total_spent', 'total')
            ->withMax('orders as last_order', 'created_at')
            ->orderBy('name')
            ->get()
            ->map(fn($c) => [
                'id' => (int)$c->id,
                'name' => $c->name,
                'phone' => $c->phone ?: '',
                'notes' => $c->notes ?: '',
                'order_count' => (int)($c->order_count ?? 0),
                'total_spent' => (int)($c->total_spent ?? 0),
                'last_order' => $c->last_order ?: '',
                'transactions' => (int)($c->order_count ?? 0),
                'spent' => (int)($c->total_spent ?? 0),
                'last' => $c->last_order ? (is_string($c->last_order) ? substr($c->last_order, 0, 10) : $c->last_order->format('Y-m-d')) : '',
                'category' => ((int)($c->order_count ?? 0) >= 10 || (int)($c->total_spent ?? 0) >= 300000) ? 'Member' : 'Reguler',
                'joined' => $c->created_at ? $c->created_at->format('Y-m-d') : date('Y-m-d'),
                'email' => $c->email ?: '',
            ])
            ->values()->all();

        // 3. Pengeluaran
        $expenses = Expense::orderByDesc('date')->orderByDesc('id')->get()->map(fn(Expense $e) => [
            'id' => (int)$e->id,
            'date' => $e->date ? $e->date->format('Y-m-d') : date('Y-m-d'),
            'category' => $e->category,
            'description' => $e->description,
            'amount' => (int)$e->amount,
            'actor' => $e->actor,
        ])->values()->all();

        // 4. Layanan & Tarif
        $services = Service::orderBy('id')->get()->map(fn(Service $s) => $this->formatService($s))->values()->all();

        // 5. Riwayat Perubahan Harga
        $priceHistory = PriceHistory::orderByDesc('date')->orderByDesc('id')->get()->map(fn(PriceHistory $h) => [
            'id' => (int)$h->id,
            'date' => $h->date ? $h->date->format('Y-m-d') : date('Y-m-d'),
            'service' => $h->service_name,
            'oldPrice' => (int)$h->old_price,
            'newPrice' => (int)$h->new_price,
            'actor' => $h->actor,
            'reason' => $h->reason ?: '',
        ])->values()->all();

        // 6. Karyawan (Tanpa password hash)
        $employees = User::orderBy('id')->get()->map(fn(User $u) => [
            'id' => (int)$u->id,
            'name' => $u->name,
            'username' => $u->username,
            'role' => $u->role === 'owner' ? 'Owner' : 'Kasir',
            'active' => (bool)$u->active,
            'phone' => $u->phone ?: '',
            'shift' => $u->shift ?: 'Pagi',
            'lastLogin' => $u->last_login_at ? $u->last_login_at->format('Y-m-d\TH:i') : '',
            'resets' => 0,
        ])->values()->all();

        // 7. Koreksi Transaksi
        $corrections = OrderCorrection::with(['order.items', 'user'])
            ->orderByDesc('id')
            ->get()
            ->map(fn(OrderCorrection $c) => $this->formatCorrection($c))
            ->values()
            ->all();

        // 8. Aktivitas Akun & Aktivitas Struk
        $accountActivity = AccountActivity::orderByDesc('id')->limit(50)->get()->map(fn(AccountActivity $a) => [
            'id' => (int)$a->id,
            'date' => $a->created_at ? $a->created_at->format('Y-m-d\TH:i') : '',
            'name' => $a->name,
            'type' => $a->type,
            'detail' => $a->detail,
        ])->values()->all();

        $receiptActivities = AccountActivity::with('order')
            ->whereNotNull('order_id')
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn(AccountActivity $a) => [
                'id' => (int)$a->id,
                'order_id' => (int)$a->order_id,
                'number' => $a->order ? $a->order->number : '',
                'customer' => $a->order ? $a->order->customer_name : '',
                'date' => $a->created_at ? $a->created_at->format('Y-m-d\TH:i') : '',
                'actor' => $a->name,
                'type' => $a->type,
                'detail' => $a->detail,
            ])->values()->all();

        // 9. Pengaturan Usaha
        $settings = BusinessSetting::allAsArray();

        // 10. Ringkasan Keuangan Otoritatif
        $collectedOrders = $orders->filter(fn(Order $o) => $o->method !== 'later' && ($o->payment_status ?: 'paid') !== 'unpaid');
        $totalRevenue = (int)$collectedOrders->sum('total');
        $totalExpenses = (int)Expense::sum('amount');
        $netProfit = $totalRevenue - $totalExpenses;

        return response()->json([
            'receipts' => $receipts,
            'customers' => $customers,
            'expenses' => $expenses,
            'services' => $services,
            'priceHistory' => $priceHistory,
            'employees' => $employees,
            'corrections' => $corrections,
            'accountActivity' => $accountActivity,
            'receiptActivities' => $receiptActivities,
            'settings' => $settings,
            'financialSummary' => [
                'totalRevenue' => $totalRevenue,
                'totalExpenses' => $totalExpenses,
                'netProfit' => $netProfit,
                'orderCount' => $orders->count(),
                'customerCount' => count($customers),
            ],
        ]);
    }

    /**
     * Tambah catatan pengeluaran baru.
     */
    public function storeExpense(Request $request): JsonResponse
    {
        $description = trim((string)$request->input('description', ''));
        $category = (string)$request->input('category', 'Operasional');
        $amount = (int)$request->input('amount', 0);
        $date = (string)$request->input('date', date('Y-m-d'));

        if (mb_strlen($description) < 2 || mb_strlen($description) > 255) {
            return response()->json(['error' => 'Keterangan pengeluaran minimal 2 karakter (maksimal 255).'], 422);
        }
        if ($amount <= 0 || $amount > 100000000) {
            return response()->json(['error' => 'Nominal pengeluaran harus berupa rupiah utuh lebih dari 0.'], 422);
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return response()->json(['error' => 'Format tanggal harus YYYY-MM-DD.'], 422);
        }

        $user = $request->user();
        $expense = Expense::create([
            'user_id' => $user->id,
            'date' => $date,
            'category' => $category,
            'description' => $description,
            'amount' => $amount,
            'actor' => $user->name,
        ]);

        return response()->json(['expense' => [
            'id' => (int)$expense->id,
            'date' => $expense->date->format('Y-m-d'),
            'category' => $expense->category,
            'description' => $expense->description,
            'amount' => (int)$expense->amount,
            'actor' => $expense->actor,
        ]], 201);
    }

    /**
     * Perbarui catatan pengeluaran.
     */
    public function updateExpense(Request $request, int|string $id): JsonResponse
    {
        $expense = Expense::find((int)$id);
        if (!$expense) {
            return response()->json(['error' => 'Catatan pengeluaran tidak ditemukan.'], 404);
        }

        $description = trim((string)$request->input('description', $expense->description));
        $category = (string)$request->input('category', $expense->category);
        $amount = (int)$request->input('amount', $expense->amount);
        $date = (string)$request->input('date', $expense->date->format('Y-m-d'));

        if (mb_strlen($description) < 2) {
            return response()->json(['error' => 'Keterangan pengeluaran minimal 2 karakter.'], 422);
        }
        if ($amount <= 0) {
            return response()->json(['error' => 'Nominal pengeluaran harus lebih dari 0.'], 422);
        }

        $expense->update([
            'date' => $date,
            'category' => $category,
            'description' => $description,
            'amount' => $amount,
        ]);

        return response()->json(['expense' => [
            'id' => (int)$expense->id,
            'date' => $expense->date->format('Y-m-d'),
            'category' => $expense->category,
            'description' => $expense->description,
            'amount' => (int)$expense->amount,
            'actor' => $expense->actor,
        ]]);
    }

    /**
     * Hapus catatan pengeluaran.
     */
    public function deleteExpense(int|string $id): JsonResponse
    {
        $expense = Expense::find((int)$id);
        if (!$expense) {
            return response()->json(['error' => 'Catatan pengeluaran tidak ditemukan.'], 404);
        }

        $expense->delete();
        return response()->json(['ok' => true]);
    }

    /**
     * Laporan & analitik keuangan otoritatif berbasis rentang tanggal.
     */
    public function reports(Request $request): JsonResponse
    {
        $from = (string)$request->input('from', date('Y-m-01'));
        $to = (string)$request->input('to', date('Y-m-t'));

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
            return response()->json(['error' => 'Format tanggal filter tidak valid.'], 422);
        }
        if ($from > $to) {
            return response()->json(['error' => 'Tanggal akhir tidak boleh sebelum tanggal awal.'], 422);
        }

        $fromDt = Carbon::parse($from)->startOfDay();
        $toDt = Carbon::parse($to)->endOfDay();

        // 1. Pesanan dalam periode
        $orders = Order::with('items')
            ->whereBetween('created_at', [$fromDt, $toDt])
            ->get();

        $collectedOrders = $orders->filter(fn(Order $o) => $o->method !== 'later' && ($o->payment_status ?: 'paid') !== 'unpaid');
        $revenue = (int)$collectedOrders->sum('total');
        $orderCount = $orders->count();

        // 2. Pengeluaran dalam periode
        $expenses = Expense::whereBetween('date', [$from, $to])->get();
        $totalExpense = (int)$expenses->sum('amount');
        $netProfit = $revenue - $totalExpense;

        // 3. Rincian metode pembayaran
        $paymentMethods = [
            'Tunai' => (int)$collectedOrders->where('method', 'cash')->sum('total'),
            'QRIS' => (int)$collectedOrders->where('method', 'qris')->sum('total'),
            'Transfer' => (int)$collectedOrders->where('method', 'transfer')->sum('total'),
        ];

        // 4. Rincian kategori pengeluaran
        $expenseByCategory = [];
        foreach ($expenses as $e) {
            $cat = $e->category ?: 'Lainnya';
            $expenseByCategory[$cat] = ($expenseByCategory[$cat] ?? 0) + (int)$e->amount;
        }

        // 5. Volume cucian
        $totalKg = (float)OrderItem::whereHas('order', function ($q) use ($fromDt, $toDt) {
            $q->whereBetween('created_at', [$fromDt, $toDt]);
        })->where('unit', 'kg')->sum('quantity');

        return response()->json([
            'period' => ['from' => $from, 'to' => $to],
            'summary' => [
                'totalRevenue' => $revenue,
                'totalExpenses' => $totalExpense,
                'netProfit' => $netProfit,
                'orderCount' => $orderCount,
                'totalKg' => round($totalKg, 2),
            ],
            'paymentMethods' => $paymentMethods,
            'expenseByCategory' => $expenseByCategory,
        ]);
    }

    /**
     * Tambah layanan baru.
     */
    public function storeService(Request $request): JsonResponse
    {
        $name = trim((string)$request->input('name', ''));
        $kind = trim((string)$request->input('kind', 'Pakaian')) ?: 'Pakaian';
        $price = (int)$request->input('price', 0);
        $unit = (string)$request->input('unit', 'kg');
        $hours = (int)$request->input('hours', 0);
        $description = trim((string)$request->input('description', ''));
        $tone = trim((string)$request->input('tone', 'blue')) ?: 'blue';
        $symbol = trim((string)$request->input('symbol', 'shirt')) ?: 'shirt';

        if (mb_strlen($name) < 3) {
            return response()->json(['error' => 'Nama layanan minimal 3 karakter.'], 422);
        }
        if (mb_strlen($kind) > 40) {
            return response()->json(['error' => 'Kategori layanan maksimal 40 karakter.'], 422);
        }
        if ($price <= 0 || $price > 10000000) {
            return response()->json(['error' => 'Harga harus berupa rupiah utuh antara 1 dan 10.000.000.'], 422);
        }
        if (!in_array($unit, ['kg', 'pcs', 'pasang'], true)) {
            return response()->json(['error' => 'Pilih satuan layanan yang valid (kg, pcs, atau pasang).'], 422);
        }
        if (Service::whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->exists()) {
            return response()->json(['error' => 'Nama layanan sudah digunakan.'], 409);
        }

        $service = Service::create([
            'name' => $name,
            'kind' => $kind,
            'price' => $price,
            'unit' => $unit,
            'duration_hours' => $hours > 0 ? $hours : null,
            'active' => true,
            'description' => $description,
            'tone' => $tone,
            'symbol' => $symbol,
        ]);

        return response()->json(['service' => $this->formatService($service)], 201);
    }

    /**
     * Perbarui layanan & tarif. Jika harga berubah, catat riwayat harga.
     */
    public function updateService(Request $request, int|string $id): JsonResponse
    {
        $service = Service::find((int)$id);
        if (!$service) {
            return response()->json(['error' => 'Layanan tidak ditemukan.'], 404);
        }

        $name = trim((string)$request->input('name', $service->name));
        $kind = $request->has('kind')
            ? (trim((string)$request->input('kind', 'Pakaian')) ?: 'Pakaian')
            : ($service->kind ?: 'Pakaian');
        $price = (int)$request->input('price', $service->price);
        $unit = (string)$request->input('unit', $service->unit);
        $hours = (int)$request->input('hours', $service->duration_hours ?? 0);
        $description = $request->has('description')
            ? trim((string)$request->input('description', ''))
            : ($service->description ?: '');
        $tone = $request->has('tone')
            ? (trim((string)$request->input('tone', 'blue')) ?: 'blue')
            : ($service->tone ?: 'blue');
        $symbol = $request->has('symbol')
            ? (trim((string)$request->input('symbol', 'shirt')) ?: 'shirt')
            : ($service->symbol ?: 'shirt');
        $reason = trim((string)$request->input('reason', 'Penyesuaian tarif'));

        if (mb_strlen($name) < 3) {
            return response()->json(['error' => 'Nama layanan minimal 3 karakter.'], 422);
        }
        if (mb_strlen($kind) > 40) {
            return response()->json(['error' => 'Kategori layanan maksimal 40 karakter.'], 422);
        }
        if ($price <= 0 || $price > 10000000) {
            return response()->json(['error' => 'Harga harus antara 1 dan 10.000.000.'], 422);
        }
        if (!in_array($unit, ['kg', 'pcs', 'pasang'], true)) {
            return response()->json(['error' => 'Pilih satuan layanan yang valid (kg, pcs, atau pasang).'], 422);
        }
        if (Service::whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->where('id', '<>', $service->id)->exists()) {
            return response()->json(['error' => 'Nama layanan sudah digunakan.'], 409);
        }

        $oldPrice = (int)$service->price;
        $priceChanged = $oldPrice !== $price;

        $service->update([
            'name' => $name,
            'kind' => $kind,
            'price' => $price,
            'unit' => $unit,
            'duration_hours' => $hours > 0 ? $hours : null,
            'description' => $description,
            'tone' => $tone,
            'symbol' => $symbol,
        ]);

        // Catat ke PriceHistory jika harga berubah
        if ($priceChanged) {
            PriceHistory::create([
                'service_id' => $service->id,
                'service_name' => $service->name,
                'date' => date('Y-m-d'),
                'old_price' => $oldPrice,
                'new_price' => $price,
                'actor' => $request->user()->name,
                'reason' => $reason ?: 'Penyesuaian tarif layanan',
            ]);
        }

        return response()->json(['service' => $this->formatService($service)]);
    }

    /**
     * Aktifkan / Nonaktifkan layanan.
     */
    public function toggleService(int|string $id): JsonResponse
    {
        $service = Service::find((int)$id);
        if (!$service) {
            return response()->json(['error' => 'Layanan tidak ditemukan.'], 404);
        }

        $service->update(['active' => !$service->active]);
        return response()->json(['service' => [
            'id' => (int)$service->id,
            'active' => (bool)$service->active,
        ]]);
    }

    /**
     * Tambah karyawan / akun kasir baru.
     */
    public function storeEmployee(Request $request): JsonResponse
    {
        $name = trim((string)$request->input('name', ''));
        $username = trim(mb_strtolower((string)$request->input('username', '')));
        $password = (string)$request->input('password', '');
        $phone = (string)$request->input('phone', '');
        $shift = (string)$request->input('shift', 'Pagi');
        $role = mb_strtolower((string)$request->input('role', 'cashier')) === 'owner' ? 'owner' : 'cashier';

        if (mb_strlen($name) < 3) {
            return response()->json(['error' => 'Nama lengkap minimal 3 karakter.'], 422);
        }
        if (!preg_match('/^[a-z0-9._]{3,24}$/', $username)) {
            return response()->json(['error' => 'Username harus berupa 3–24 huruf, angka, titik, atau underscore.'], 422);
        }
        if (mb_strlen($password) < 6) {
            return response()->json(['error' => 'Password minimal 6 karakter.'], 422);
        }
        if (User::where('username', $username)->exists()) {
            return response()->json(['error' => 'Username sudah digunakan.'], 409);
        }

        $user = User::create([
            'name' => $name,
            'username' => $username,
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'role' => $role,
            'phone' => $phone,
            'shift' => $shift,
            'active' => true,
        ]);

        AccountActivity::create([
            'user_id' => $user->id,
            'name' => $name,
            'type' => 'Akun Dibuat',
            'detail' => "Akun {$role} {$username} dibuat oleh " . $request->user()->name,
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['employee' => [
            'id' => (int)$user->id,
            'name' => $user->name,
            'username' => $user->username,
            'role' => $user->role === 'owner' ? 'Owner' : 'Kasir',
            'active' => (bool)$user->active,
            'phone' => $user->phone,
            'shift' => $user->shift,
        ]], 201);
    }

    /**
     * Perbarui data karyawan.
     */
    public function updateEmployee(Request $request, int|string $id): JsonResponse
    {
        $user = User::find((int)$id);
        if (!$user) {
            return response()->json(['error' => 'Karyawan tidak ditemukan.'], 404);
        }

        $name = trim((string)$request->input('name', $user->name));
        $phone = (string)$request->input('phone', $user->phone);
        $shift = (string)$request->input('shift', $user->shift);
        $role = mb_strtolower((string)$request->input('role', $user->role)) === 'owner' ? 'owner' : 'cashier';
        $active = $request->boolean('active', $user->active);

        // Safeguard: Tidak boleh menonaktifkan akun owner jika tidak ada owner lain yang aktif
        if ($user->role === 'owner' && (!$active || $role !== 'owner')) {
            $otherOwnerCount = User::where('role', 'owner')->where('active', true)->where('id', '<>', $user->id)->count();
            if ($otherOwnerCount === 0) {
                return response()->json(['error' => 'Minimal satu akun Owner harus tetap aktif.'], 422);
            }
        }

        $user->update([
            'name' => $name,
            'phone' => $phone,
            'shift' => $shift,
            'role' => $role,
            'active' => $active,
        ]);

        AccountActivity::create([
            'user_id' => $user->id,
            'name' => $name,
            'type' => 'Update Data',
            'detail' => "Data karyawan diperbarui oleh " . $request->user()->name,
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['employee' => [
            'id' => (int)$user->id,
            'name' => $user->name,
            'username' => $user->username,
            'role' => $user->role === 'owner' ? 'Owner' : 'Kasir',
            'active' => (bool)$user->active,
            'phone' => $user->phone,
            'shift' => $user->shift,
        ]]);
    }

    /**
     * Reset password karyawan.
     */
    public function resetEmployeePassword(Request $request, int|string $id): JsonResponse
    {
        $user = User::find((int)$id);
        if (!$user) {
            return response()->json(['error' => 'Karyawan tidak ditemukan.'], 404);
        }

        $password = (string)$request->input('password', '');
        if (mb_strlen($password) < 6) {
            return response()->json(['error' => 'Password baru minimal 6 karakter.'], 422);
        }

        $user->update([
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
        ]);

        AccountActivity::create([
            'user_id' => $user->id,
            'name' => $user->name,
            'type' => 'Reset Password',
            'detail' => "Password akun {$user->username} direset oleh " . $request->user()->name,
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['ok' => true]);
    }

    /**
     * Simpan koreksi transaksi / pembatalan nota.
     */
    public function storeCorrection(Request $request): JsonResponse
    {
        $orderId = (int)$request->input('order_id', 0);
        $type = trim((string)$request->input('type', 'Pembatalan'));
        $reason = trim((string)$request->input('reason', ''));

        $order = Order::with('items')->find($orderId);
        if (!$order) {
            return response()->json(['error' => 'Pesanan tidak ditemukan.'], 404);
        }
        if (!in_array($type, ['Pembatalan', 'Penyesuaian Harga', 'Koreksi Berat', 'Koreksi Layanan'], true)) {
            return response()->json(['error' => 'Jenis koreksi tidak valid.'], 422);
        }
        if (mb_strlen($reason) < 3) {
            return response()->json(['error' => 'Alasan koreksi harus diisi minimal 3 karakter.'], 422);
        }

        $firstItem = $order->items->first();
        $oldWeight = (float)$order->items->sum('quantity');
        $oldValues = [
            'status' => $order->status,
            'total' => (int)$order->total,
            'weight' => $oldWeight > 0 ? $oldWeight : 1.0,
            'price' => (int)($firstItem ? $firstItem->price : 0),
            'service' => $firstItem ? $firstItem->service_name : '-',
            'items' => $order->items->toArray(),
        ];

        $rawNew = $request->input('new_values', null);
        $newValues = null;
        if ($type === 'Pembatalan' && !is_array($rawNew)) {
            $newValues = [
                'status' => 'Dibatalkan',
                'total' => 0,
                'weight' => 0,
                'price' => 0,
                'service' => $oldValues['service'],
            ];
        } elseif (is_array($rawNew)) {
            $newTotal = isset($rawNew['total']) ? (int)$rawNew['total'] : $oldValues['total'];
            $newWeight = isset($rawNew['weight']) ? (float)$rawNew['weight'] : $oldValues['weight'];
            $newPrice = isset($rawNew['price']) ? (int)$rawNew['price'] : $oldValues['price'];
            if ($newTotal < 0 || $newWeight < 0 || $newPrice < 0) {
                return response()->json(['error' => 'Nilai koreksi tidak boleh bernilai negatif.'], 422);
            }
            $newValues = [
                'total' => $newTotal,
                'weight' => $newWeight,
                'price' => $newPrice,
                'service' => trim((string)($rawNew['service'] ?? $oldValues['service'])) ?: $oldValues['service'],
                'service_id' => isset($rawNew['service_id']) ? (int)$rawNew['service_id'] : ($firstItem ? (int)$firstItem->service_id : null),
            ];
        }

        $correction = OrderCorrection::create([
            'order_id' => $order->id,
            'user_id' => $request->user()->id,
            'type' => $type,
            'reason' => $reason,
            'status' => 'Diproses',
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'created_at' => now(),
        ]);

        $correction->load(['order.items', 'user']);

        return response()->json(['correction' => $this->formatCorrection($correction)], 201);
    }

    /**
     * Putuskan persetujuan atau penolakan koreksi transaksi secara atomik.
     */
    public function decideCorrection(Request $request, int|string $id): JsonResponse
    {
        $correction = OrderCorrection::with(['order.items', 'user'])->find((int)$id);
        if (!$correction) {
            return response()->json(['error' => 'Data koreksi tidak ditemukan.'], 404);
        }
        if (($correction->status ?: 'Selesai') !== 'Diproses') {
            return response()->json(['error' => 'Koreksi ini sudah diputuskan sebelumnya.'], 409);
        }

        $action = (string)$request->input('action', '');
        $note = trim((string)$request->input('note', ''));

        if (!in_array($action, ['approve', 'reject'], true)) {
            return response()->json(['error' => 'Tindakan keputusan harus approve atau reject.'], 422);
        }
        if ($action === 'reject' && mb_strlen($note) < 3) {
            return response()->json(['error' => 'Alasan penolakan harus diisi minimal 3 karakter.'], 422);
        }

        $resolvedNote = $note !== '' ? $note : 'Disetujui oleh Owner';

        DB::transaction(function () use ($correction, $action, $resolvedNote, $request) {
            $correction->update([
                'status' => $action === 'approve' ? 'Selesai' : 'Ditolak',
                'decision_note' => $resolvedNote,
                'decided_at' => now(),
            ]);

            if ($action === 'approve' && $correction->order) {
                $order = Order::with('items')->lockForUpdate()->find($correction->order_id);
                if ($order) {
                    $new = is_array($correction->new_values) ? $correction->new_values : [];
                    if ($correction->type === 'Pembatalan') {
                        $tag = "[DIBATALKAN: {$correction->reason}]";
                        $order->update([
                            'subtotal' => 0,
                            'total' => 0,
                            'paid' => 0,
                            'change_amount' => 0,
                            'payment_status' => 'unpaid',
                            'notes' => str_contains((string)$order->notes, $tag)
                                ? $order->notes
                                : trim(((string)$order->notes) . ' ' . $tag),
                        ]);
                    } else {
                        $finalTotal = max(0, (int)($new['total'] ?? $order->total));
                        $tag = "[KOREKSI {$correction->type}: {$correction->reason}]";
                        $order->update([
                            'subtotal' => $finalTotal,
                            'total' => $finalTotal,
                            'change_amount' => max(0, (int)$order->paid - $finalTotal),
                            'notes' => str_contains((string)$order->notes, $tag)
                                ? $order->notes
                                : trim(((string)$order->notes) . ' ' . $tag),
                        ]);
                        $firstItem = $order->items->first();
                        if ($firstItem) {
                            $firstItem->update([
                                'service_id' => isset($new['service_id']) && $new['service_id'] ? (int)$new['service_id'] : $firstItem->service_id,
                                'service_name' => trim((string)($new['service'] ?? $firstItem->service_name)) ?: $firstItem->service_name,
                                'price' => isset($new['price']) ? max(0, (int)$new['price']) : $firstItem->price,
                                'quantity' => isset($new['weight']) && (float)$new['weight'] > 0 ? (float)$new['weight'] : $firstItem->quantity,
                                'subtotal' => $finalTotal,
                            ]);
                        }
                    }
                }
            }

            AccountActivity::create([
                'user_id' => $request->user()->id,
                'order_id' => $correction->order_id,
                'name' => $request->user()->name,
                'type' => $action === 'approve' ? 'Koreksi Disetujui' : 'Koreksi Ditolak',
                'detail' => ($correction->order ? $correction->order->number : '#' . $correction->order_id) . " ({$correction->type}): {$resolvedNote}",
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        });

        $correction->refresh()->load(['order.items', 'user']);
        $receipt = null;
        if ($correction->order) {
            $order = Order::with(['items', 'history.user', 'latestNotification', 'cashier'])->find($correction->order_id);
            if ($order) {
                $reprints = AccountActivity::where('order_id', $order->id)->where('type', 'Struk Dicetak Ulang')->count();
                $receipt = $this->formatReceipt($order, $reprints);
            }
        }

        return response()->json([
            'correction' => $this->formatCorrection($correction),
            'receipt' => $receipt,
        ]);
    }

    /**
     * Catat aktivitas cetak ulang atau unduh PDF struk tanpa mengubah status cucian.
     */
    public function logReceiptActivity(Request $request, int|string $id): JsonResponse
    {
        $order = Order::find((int)$id);
        if (!$order) {
            return response()->json(['error' => 'Nota tidak ditemukan.'], 404);
        }

        $action = (string)$request->input('action', 'print');
        if (!in_array($action, ['print', 'download'], true)) {
            return response()->json(['error' => 'Aksi aktivitas struk tidak valid.'], 422);
        }

        $type = $action === 'download' ? 'Struk Diunduh PDF' : 'Struk Dicetak Ulang';
        $prefix = $action === 'download' ? 'Mengunduh PDF nota ' : 'Mencetak ulang nota ';

        $activity = AccountActivity::create([
            'user_id' => $request->user()->id,
            'order_id' => $order->id,
            'name' => $request->user()->name,
            'type' => $type,
            'detail' => $prefix . ($order->number ?: 'SYQ-' . $order->id) . ' (' . $order->customer_name . ')',
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        $reprintCount = AccountActivity::where('order_id', $order->id)
            ->where('type', 'Struk Dicetak Ulang')
            ->count();

        return response()->json([
            'activity' => [
                'id' => (int)$activity->id,
                'order_id' => (int)$order->id,
                'number' => $order->number ?: 'SYQ-' . $order->id,
                'customer' => $order->customer_name,
                'date' => $activity->created_at ? $activity->created_at->format('Y-m-d\TH:i') : date('Y-m-d\TH:i'),
                'actor' => $activity->name,
                'type' => $activity->type,
                'detail' => $activity->detail,
            ],
            'reprint_count' => (int)$reprintCount,
        ], 201);
    }

    /**
     * Perbarui pengaturan profil bisnis, QRIS, rekening bank, dan gateway WhatsApp.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $settings = $request->input('settings', []);
        if (!is_array($settings)) {
            return response()->json(['error' => 'Format pengaturan tidak valid.'], 422);
        }

        if (isset($settings['qris_image']) && $settings['qris_image'] !== '' && $settings['qris_image'] !== null) {
            $qris = (string)$settings['qris_image'];
            if (strlen($qris) > 2500000 || !preg_match('/^(data:image\/(png|jpeg|jpg|webp);base64,|https?:\/\/|\/)/i', $qris)) {
                return response()->json(['error' => 'Gambar QRIS harus berupa PNG/JPG/WebP yang valid (maks. 2 MB).'], 422);
            }
        }

        $current = BusinessSetting::allAsArray();
        $waEnabledVal = array_key_exists('whatsapp_enabled', $settings)
            ? (filter_var($settings['whatsapp_enabled'], FILTER_VALIDATE_BOOLEAN) || $settings['whatsapp_enabled'] === '1' || $settings['whatsapp_enabled'] === 1 ? '1' : '0')
            : ($current['whatsapp_enabled'] ?? '0');
        $waUrlVal = array_key_exists('whatsapp_gateway_url', $settings)
            ? trim((string)$settings['whatsapp_gateway_url'])
            : trim((string)($current['whatsapp_gateway_url'] ?? ''));

        if ($waEnabledVal === '1' && (!filter_var($waUrlVal, FILTER_VALIDATE_URL) || !preg_match('/^https?:\/\//i', $waUrlVal))) {
            return response()->json(['error' => 'URL endpoint WhatsApp Gateway harus diawali http:// atau https:// jika diaktifkan.'], 422);
        }

        $aliases = [
            'name' => 'business_name',
            'business_name' => 'name',
            'address' => 'business_address',
            'business_address' => 'address',
            'phone' => 'business_phone',
            'business_phone' => 'phone',
        ];

        foreach ($settings as $key => $val) {
            $keyStr = (string)$key;
            if ($keyStr === 'whatsapp_enabled') {
                $stored = $waEnabledVal;
            } elseif ($val === null) {
                $stored = '';
            } elseif (is_bool($val)) {
                $stored = $val ? '1' : '0';
            } elseif (is_scalar($val)) {
                $stored = (string)$val;
            } else {
                $stored = json_encode($val);
            }

            BusinessSetting::updateOrCreate(['key' => $keyStr], ['value' => $stored]);
            if (isset($aliases[$keyStr])) {
                BusinessSetting::updateOrCreate(['key' => $aliases[$keyStr]], ['value' => $stored]);
            }
        }

        return response()->json([
            'settings' => BusinessSetting::allAsArray(),
        ]);
    }

    private function formatReceipt(Order $order, int $reprintCount = 0): array
    {
        $firstItem = $order->items->first();
        $totalWeight = (float)$order->items->sum('quantity');

        return [
            'id' => (int)$order->id,
            'number' => $order->number ?: 'SYQ-' . $order->id,
            'date' => $order->created_at ? $order->created_at->format('Y-m-d') : date('Y-m-d'),
            'time' => $order->created_at ? $order->created_at->format('H:i') : '00:00',
            'customer' => $order->customer_name,
            'phone' => $order->customer_phone,
            'service' => $firstItem ? $firstItem->service_name : 'Cucian',
            'employee' => $order->cashier ? $order->cashier->name : 'Kasir',
            'method' => match ($order->method) {
                'cash' => 'Tunai',
                'qris' => 'QRIS',
                'transfer' => 'Transfer',
                'later' => 'Bayar Nanti',
                default => ucfirst($order->method),
            },
            'amount' => (int)$order->total,
            'total' => (int)$order->total,
            'weight' => $totalWeight > 0 ? $totalWeight : 1.0,
            'subtotal' => (int)$order->subtotal,
            'paid' => (int)$order->paid,
            'change_amount' => (int)$order->change_amount,
            'status' => $order->status,
            'payment_status' => $order->payment_status ?: 'paid',
            'reprint_count' => $reprintCount,
            'notes' => $order->notes,
            'items' => $order->items->map(fn(OrderItem $i) => [
                'id' => $i->id,
                'service_name' => $i->service_name,
                'unit' => $i->unit,
                'price' => (int)$i->price,
                'quantity' => (float)$i->quantity,
                'category' => $i->category,
                'subtotal' => (int)$i->subtotal,
            ])->values()->all(),
        ];
    }

    private function formatService(Service $s): array
    {
        $hours = (int)($s->duration_hours ?? 0);

        return [
            'id' => (int)$s->id,
            'name' => $s->name,
            'kind' => $s->kind ?: 'Pakaian',
            'price' => (int)$s->price,
            'unit' => $s->unit,
            'duration_hours' => $hours,
            'duration' => $hours === 24 ? 'day' : ($hours > 0 ? 'hours' : 'normal'),
            'hours' => $hours,
            'active' => (bool)$s->active,
            'description' => $s->description ?: '',
            'tone' => $s->tone ?: 'blue',
            'symbol' => $s->symbol ?: 'shirt',
        ];
    }

    private function formatCorrection(OrderCorrection $c): array
    {
        $old = is_array($c->old_values) ? $c->old_values : [];
        $new = is_array($c->new_values) ? $c->new_values : [];
        $firstOldItem = $old['items'][0] ?? [];
        $oldWeight = (float)($old['weight'] ?? collect($old['items'] ?? [])->sum('quantity'));
        $oldPrice = (int)($old['price'] ?? ($firstOldItem['price'] ?? 0));
        $oldService = (string)($old['service'] ?? ($firstOldItem['service_name'] ?? '-'));
        $oldTotal = (int)($old['total'] ?? 0);

        $newTotal = array_key_exists('total', $new)
            ? (int)$new['total']
            : ($c->type === 'Pembatalan' ? 0 : $oldTotal);
        $newWeight = array_key_exists('weight', $new) ? (float)$new['weight'] : ($c->type === 'Pembatalan' ? 0.0 : $oldWeight);
        $newPrice = array_key_exists('price', $new) ? (int)$new['price'] : ($c->type === 'Pembatalan' ? 0 : $oldPrice);
        $newService = (string)($new['service'] ?? $oldService);

        return [
            'id' => (int)$c->id,
            'order_id' => (int)$c->order_id,
            'number' => $c->order ? $c->order->number : '',
            'customer' => $c->order ? $c->order->customer_name : '',
            'phone' => $c->order ? $c->order->customer_phone : '',
            'date' => $c->created_at ? $c->created_at->format('Y-m-d\TH:i') : '',
            'type' => $c->type,
            'reason' => $c->reason,
            'status' => $c->status ?: 'Selesai',
            'decisionNote' => $c->decision_note ?: '',
            'decidedAt' => $c->decided_at ? $c->decided_at->format('Y-m-d\TH:i') : '',
            'actor' => $c->user ? $c->user->name : 'Owner',
            'old_values' => $old,
            'new_values' => $new ?: null,
            'before' => [
                'total' => $oldTotal,
                'weight' => $oldWeight,
                'price' => $oldPrice,
                'service' => $oldService,
            ],
            'after' => [
                'total' => $newTotal,
                'weight' => $newWeight,
                'price' => $newPrice,
                'service' => $newService,
            ],
        ];
    }
}
