<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Request as CaseNoteRequest;
use App\Models\HandoverRequest;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get consolidated dashboard stats for the authenticated user
     */
    public function getStats(): JsonResponse
    {
        $user = Auth::user();
        $startTime = microtime(true);

        try {
            // Cache key based on user ID and role
            $cacheKey = "dashboard_stats_{$user->id}_{$user->roles->pluck('name')->first()}";

            // Check cache first (cache for 30 seconds to balance freshness vs performance)
            if (Cache::has($cacheKey)) {
                $cachedStats = Cache::get($cacheKey);
                $executionTime = microtime(true) - $startTime;

                Log::info('Dashboard stats served from cache', [
                    'user_id' => $user->id,
                    'user_role' => $user->roles->pluck('name')->first(),
                    'execution_time_ms' => round($executionTime * 1000, 2),
                    'cache_hit' => true
                ]);

                return response()->json([
                    'success' => true,
                    'data' => $cachedStats,
                    'execution_time_ms' => round($executionTime * 1000, 2),
                    'cached' => true
                ]);
            }

            if ($user->hasRole('CA', 'api')) {
                $stats = $this->getCAStats($user);
            } elseif ($user->hasRole('MR_STAFF', 'api')) {
                $stats = $this->getMRStaffStats($user);
            } elseif ($user->hasRole('ADMIN', 'api')) {
                $stats = $this->getAdminStats($user);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'User role not supported for dashboard'
                ], 403);
            }

            // Cache the results for 30 seconds
            Cache::put($cacheKey, $stats, 30);

            $executionTime = microtime(true) - $startTime;

            Log::info('Dashboard stats generated successfully', [
                'user_id' => $user->id,
                'user_role' => $user->roles->pluck('name')->first(),
                'execution_time_ms' => round($executionTime * 1000, 2),
                'stats_keys' => array_keys($stats),
                'cache_hit' => false
            ]);

            return response()->json([
                'success' => true,
                'data' => $stats,
                'execution_time_ms' => round($executionTime * 1000, 2),
                'cached' => false
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating dashboard stats', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error retrieving dashboard statistics'
            ], 500);
        }
    }

    /**
     * Get optimized stats for CA users using single query with conditional aggregation
     */
    private function getCAStats($user): array
    {
        // Single optimized query for all CA stats
        $stats = DB::table('requests')
            ->selectRaw('
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending_requests,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as approved_requests,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed_requests,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as rejected_requests,
                SUM(CASE WHEN needed_date < ? AND status NOT IN (?, ?) THEN 1 ELSE 0 END) as overdue_requests,
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_requests,
                SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN 1 ELSE 0 END) as this_week_requests,
                SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN 1 ELSE 0 END) as this_month_requests,
                SUM(CASE WHEN status = ? AND is_received = 0 AND approved_at IS NOT NULL THEN 1 ELSE 0 END) as pending_verifications
            ', [
                CaseNoteRequest::STATUS_PENDING,
                CaseNoteRequest::STATUS_APPROVED,
                CaseNoteRequest::STATUS_COMPLETED,
                CaseNoteRequest::STATUS_REJECTED,
                now()->startOfDay(),
                CaseNoteRequest::STATUS_COMPLETED,
                CaseNoteRequest::STATUS_REJECTED,
                now()->startOfWeek(),
                now()->endOfWeek(),
                CaseNoteRequest::STATUS_APPROVED
            ])
            ->where('requested_by_user_id', $user->id)
            ->first();

        // Get pending handover requests count for CA dashboard
        $pendingHandoverCount = DB::table('handover_requests')
            ->where('current_holder_user_id', $user->id)
            ->where('status', HandoverRequest::STATUS_PENDING) // Only count pending handovers that CA hasn't approved/rejected yet
            ->count();

        // Log handover stats for debugging
        Log::info('CA Dashboard handover stats:', [
            'user_id' => $user->id,
            'pending_handover_count' => $pendingHandoverCount,
            'query_conditions' => [
                'current_holder_user_id' => $user->id,
                'status' => HandoverRequest::STATUS_PENDING
            ]
        ]);

        // Get active case notes count in single query
        $activeCaseNotesCount = DB::table('requests')
            ->where('current_pic_user_id', $user->id)
            ->where('is_received', true)
            ->where(function($query) {
                $query->where(function($q) {
                    $q->whereIn('status', [CaseNoteRequest::STATUS_APPROVED, CaseNoteRequest::STATUS_COMPLETED])
                      ->where('is_returned', false)
                      ->where('is_rejected_return', false);
                })
                ->orWhere('is_rejected_return', true)
                ->orWhereIn('handover_status', ['pending', 'approved_pending_verification']);
            });

        // Log the query details for debugging
        $debugQuery = clone $activeCaseNotesCount;
        $debugResults = $debugQuery->get(['id', 'status', 'is_received', 'current_pic_user_id', 'requested_by_user_id']);

        Log::info('Dashboard active case notes query debug:', [
            'user_id' => $user->id,
            'user_roles' => $user->getRoleNames('api'),
            'query_conditions' => [
                'current_pic_user_id' => $user->id,
                'is_received' => true,
                'status_in' => [CaseNoteRequest::STATUS_APPROVED, CaseNoteRequest::STATUS_COMPLETED],
                'is_returned' => false,
                'is_rejected_return' => false
            ],
            'debug_results_count' => $debugResults->count(),
            'debug_results' => $debugResults->toArray()
        ]);

        $activeCaseNotesCount = $activeCaseNotesCount->count();

        return [
            // Basic stats
            'total_requests' => $stats->total_requests ?? 0,
            'pending_requests' => $stats->pending_requests ?? 0,
            'approved_requests' => $stats->approved_requests ?? 0,
            'completed_requests' => $stats->completed_requests ?? 0,
            'rejected_requests' => $stats->rejected_requests ?? 0,
            'overdue_requests' => $stats->overdue_requests ?? 0,

            // Time-based stats
            'today_requests' => $stats->today_requests ?? 0,
            'this_week_requests' => $stats->this_week_requests ?? 0,
            'this_month_requests' => $stats->this_month_requests ?? 0,

            // Verification stats
            'pending_verifications' => $stats->pending_verifications ?? 0,

            // Handover stats - only pending handovers that CA hasn't approved/rejected yet
            'total_handovers' => $pendingHandoverCount,
            'pending_handovers' => $pendingHandoverCount,
            'completed_handovers' => 0, // Not relevant for CA dashboard

            // Active case notes
            'active_case_notes' => $activeCaseNotesCount,

            // Legacy compatibility
            'total' => $stats->total_requests ?? 0,
            'pending' => $stats->pending_requests ?? 0,
            'approved' => $stats->approved_requests ?? 0,
            'in_progress' => 0,
            'completed' => $stats->completed_requests ?? 0,
            'overdue' => $stats->overdue_requests ?? 0,
        ];
    }

    /**
     * Get optimized stats for MR Staff users
     */
    private function getMRStaffStats($user): array
    {
        $stats = DB::table('requests')
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN needed_date < ? AND status NOT IN (?, ?) THEN 1 ELSE 0 END) as overdue
            ', [
                CaseNoteRequest::STATUS_PENDING,
                CaseNoteRequest::STATUS_APPROVED,
                CaseNoteRequest::STATUS_IN_PROGRESS,
                CaseNoteRequest::STATUS_COMPLETED,
                now()->startOfDay(),
                CaseNoteRequest::STATUS_COMPLETED,
                CaseNoteRequest::STATUS_REJECTED
            ])
            ->first();

        return [
            'total' => $stats->total ?? 0,
            'pending' => $stats->pending ?? 0,
            'approved' => $stats->approved ?? 0,
            'in_progress' => $stats->in_progress ?? 0,
            'completed' => $stats->completed ?? 0,
            'overdue' => $stats->overdue ?? 0,

            // Role-specific stats
            'total_requests' => $stats->total ?? 0,
            'pending_review' => $stats->pending ?? 0,
            'in_progress_count' => $stats->in_progress ?? 0,
            'completed_count' => $stats->completed ?? 0,
        ];
    }

    /**
     * Get optimized stats for Admin users
     */
    private function getAdminStats($user): array
    {
        $stats = DB::table('requests')
            ->selectRaw('COUNT(*) as total_requests')
            ->first();

        $userStats = DB::table('users')
            ->selectRaw('COUNT(*) as total_users')
            ->first();

        return [
            'total' => $stats->total_requests ?? 0,
            'total_users' => $userStats->total_users ?? 0,
            'total_requests' => $stats->total_requests ?? 0,
            'system_health' => 'Good',
            'active_sessions' => 0, // Could be implemented with session tracking
        ];
    }
}
