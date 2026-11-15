<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('services') && !Schema::hasColumn('services', 'kind')) {
            Schema::table('services', function (Blueprint $table) {
                $table->string('kind', 40)->default('Pakaian')->after('name');
            });
        }

        if (Schema::hasTable('customers') && !Schema::hasColumn('customers', 'email')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->string('email', 160)->nullable()->after('phone');
            });
        }

        if (Schema::hasTable('order_corrections')) {
            Schema::table('order_corrections', function (Blueprint $table) {
                if (!Schema::hasColumn('order_corrections', 'status')) {
                    $table->string('status', 30)->default('Selesai')->after('reason');
                }
                if (!Schema::hasColumn('order_corrections', 'decision_note')) {
                    $table->text('decision_note')->nullable()->after('status');
                }
                if (!Schema::hasColumn('order_corrections', 'decided_at')) {
                    $table->timestamp('decided_at')->nullable()->after('decision_note');
                }
            });
        }

        if (Schema::hasTable('account_activities') && !Schema::hasColumn('account_activities', 'order_id')) {
            Schema::table('account_activities', function (Blueprint $table) {
                $table->unsignedBigInteger('order_id')->nullable()->after('user_id');
                $table->foreign('order_id')->references('id')->on('orders')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('account_activities') && Schema::hasColumn('account_activities', 'order_id')) {
            Schema::table('account_activities', function (Blueprint $table) {
                $table->dropForeign(['order_id']);
                $table->dropColumn('order_id');
            });
        }

        if (Schema::hasTable('order_corrections')) {
            Schema::table('order_corrections', function (Blueprint $table) {
                foreach (['decided_at', 'decision_note', 'status'] as $col) {
                    if (Schema::hasColumn('order_corrections', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('customers') && Schema::hasColumn('customers', 'email')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropColumn('email');
            });
        }

        if (Schema::hasTable('services') && Schema::hasColumn('services', 'kind')) {
            Schema::table('services', function (Blueprint $table) {
                $table->dropColumn('kind');
            });
        }
    }
};
