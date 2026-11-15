<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountActivity extends Model
{
    use HasFactory;

    protected $table = 'account_activities';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'order_id',
        'name',
        'type',
        'detail',
        'ip_address',
        'created_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'order_id' => 'integer',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
