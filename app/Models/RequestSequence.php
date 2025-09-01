<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class RequestSequence extends Model
{
    protected $fillable = [
        'date_key',
        'current_sequence',
    ];

    protected $casts = [
        'current_sequence' => 'integer',
    ];

    /**
     * Get the next sequence number for a given date atomically
     * This method uses database transactions and row-level locking to prevent race conditions
     */
    public static function getNextSequence(string $dateKey): int
    {
        return DB::transaction(function () use ($dateKey) {
            // Lock the row for update to prevent race conditions
            $sequence = self::where('date_key', $dateKey)
                ->lockForUpdate()
                ->first();

            if (!$sequence) {
                // Create new sequence record for this date
                $sequence = self::create([
                    'date_key' => $dateKey,
                    'current_sequence' => 0,
                ]);

                Log::info('Created new request sequence record', [
                    'date_key' => $dateKey,
                    'initial_sequence' => 0
                ]);
            }

            // Increment the sequence
            $nextSequence = $sequence->current_sequence + 1;
            $sequence->update(['current_sequence' => $nextSequence]);

            Log::info('Generated next request sequence', [
                'date_key' => $dateKey,
                'previous_sequence' => $sequence->current_sequence - 1,
                'new_sequence' => $nextSequence
            ]);

            return $nextSequence;
        });
    }

    /**
     * Generate a request number based on the current date and sequence
     */
    public static function generateRequestNumber(): string
    {
        $prefix = 'REQ';
        $dateKey = Carbon::now()->format('Ymd');

        $sequence = self::getNextSequence($dateKey);
        $paddedSequence = str_pad($sequence, 4, '0', STR_PAD_LEFT);

        return "{$prefix}{$dateKey}{$paddedSequence}";
    }

    /**
     * Get the current sequence for a specific date (for debugging/testing)
     */
    public static function getCurrentSequence(string $dateKey): int
    {
        $sequence = self::where('date_key', $dateKey)->first();
        return $sequence ? $sequence->current_sequence : 0;
    }
}
