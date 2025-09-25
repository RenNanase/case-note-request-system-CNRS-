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

            // Clear any existing cache for this user to ensure fresh data
            Cache::forget($cacheKey);
            
            // Clear all dashboard-related cache keys for this user
            Cache::forget("dashboard_stats_{$user->id}_CA");
            Cache::forget("dashboard_stats_{$user->id}");
            
            // Temporarily disable caching to debug verification badge issue
            // Cache::put($cacheKey, $stats, 30);

            $executionTime = microtime(true) - $startTime;

            Log::info('Dashboard stats generated successfully', [
                'user_id' => $user->id,
                'user_role' => $user->roles->pluck('name')->first(),
                'execution_time_ms' => round($executionTime * 1000, 2),
                'stats_keys' => array_keys($stats),
                'stats_values' => $stats,
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
        // Get original case note request stats
        $originalStats = DB::table('requests')
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
                SUM(CASE WHEN status = ? AND is_received = 0 AND approved_at IS NOT NULL AND current_pic_user_id = ? THEN 1 ELSE 0 END) as pending_verifications
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
                CaseNoteRequest::STATUS_APPROVED,
                $user->id // Add user ID parameter for pending_verifications check
            ])
            ->where('requested_by_user_id', $user->id)
            ->first();

        // Get handover request stats made by this CA
        $handoverStats = DB::table('handover_requests')
            ->selectRaw('
                COUNT(*) as total_handover_requests,
                SUM(CASE WHEN DATE(requested_at) = CURDATE() THEN 1 ELSE 0 END) as today_handover_requests,
                SUM(CASE WHEN requested_at >= ? AND requested_at <= ? THEN 1 ELSE 0 END) as this_week_handover_requests,
                SUM(CASE WHEN YEAR(requested_at) = YEAR(CURDATE()) AND MONTH(requested_at) = MONTH(CURDATE()) THEN 1 ELSE 0 END) as this_month_handover_requests
            ', [
                now()->startOfWeek(),
                now()->endOfWeek()
            ])
            ->where('requested_by_user_id', $user->id)
            ->first();

        // Combine original and handover stats
        $stats = (object) [
            'total_requests' => ($originalStats->total_requests ?? 0) + ($handoverStats->total_handover_requests ?? 0),
            'pending_requests' => $originalStats->pending_requests ?? 0,
            'approved_requests' => $originalStats->approved_requests ?? 0,
            'completed_requests' => $originalStats->completed_requests ?? 0,
            'rejected_requests' => $originalStats->rejected_requests ?? 0,
            'overdue_requests' => $originalStats->overdue_requests ?? 0,
            'today_requests' => ($originalStats->today_requests ?? 0) + ($handoverStats->today_handover_requests ?? 0),
            'this_week_requests' => ($originalStats->this_week_requests ?? 0) + ($handoverStats->this_week_handover_requests ?? 0),
            'this_month_requests' => ($originalStats->this_month_requests ?? 0) + ($handoverStats->this_month_handover_requests ?? 0),
            'pending_verifications' => $originalStats->pending_verifications ?? 0,
        ];

        // Get pending handover requests count for CA dashboard
        $pendingHandoverCount = DB::table('handover_requests')
            ->where('current_holder_user_id', $user->id)
            ->where('status', HandoverRequest::STATUS_PENDING) // Only count pending handovers that CA hasn't approved/rejected yet
            ->count();

        // Get pending handover requests for verification count (handover requests that this CA needs to verify)
        // This CA is the current holder who needs to approve/reject the handover request
        $pendingHandoverVerificationCount = DB::table('handover_requests')
            ->where('current_holder_user_id', $user->id)
            ->where('status', HandoverRequest::STATUS_PENDING)
            ->count();

        // Get approved handover requests that this CA requested and need verification
        // This CA requested the handover, it was approved, but they haven't verified the case note yet
        // Only count handovers where the case note is actually received and ready for verification
        $approvedHandoversPendingVerification = DB::table('handover_requests')
            ->join('requests', 'handover_requests.case_note_id', '=', 'requests.id')
            ->where('handover_requests.requested_by_user_id', $user->id)
            ->where('handover_requests.status', HandoverRequest::STATUS_APPROVED_PENDING_VERIFICATION)
            ->where('requests.current_pic_user_id', $user->id) // Only count if CA currently owns the case note
            ->where('requests.is_received', true) // Only count if case note is received
            ->count();

        // Ensure the counts are always integers (never null)
        $pendingHandoverVerificationCount = (int) $pendingHandoverVerificationCount;
        $approvedHandoversPendingVerification = (int) $approvedHandoversPendingVerification;

        // Debug: Get actual handover request data for this user (as current holder)
        $debugHandoverRequests = DB::table('handover_requests')
            ->where('current_holder_user_id', $user->id)
            ->select(['id', 'status', 'case_note_id', 'requested_at', 'requested_by_user_id'])
            ->get();

        // Log handover stats for debugging with timestamp
        Log::info('CA Dashboard handover stats:', [
            'timestamp' => now()->toDateTimeString(),
            'user_id' => $user->id,
            'user_name' => $user->name,
            'pending_handover_count' => $pendingHandoverCount,
            'pending_handover_verification_count' => $pendingHandoverVerificationCount,
            'approved_handovers_pending_verification' => $approvedHandoversPendingVerification,
            'pending_verifications' => $stats->pending_verifications ?? 0,
            'total_verification_count' => ($stats->pending_verifications ?? 0) + $approvedHandoversPendingVerification,
            'query_conditions' => [
                'current_holder_user_id' => $user->id,
                'status' => HandoverRequest::STATUS_PENDING
            ],
            'verification_query_conditions' => [
                'current_holder_user_id' => $user->id,
                'status' => HandoverRequest::STATUS_PENDING
            ],
            'cache_key' => "dashboard_stats_user_{$user->id}",
            'debug_handover_requests' => $debugHandoverRequests->toArray()
        ]);

        // Get active case notes count - show all case notes currently owned by this CA
        // This includes both originally requested case notes AND case notes received via handover
        // The key is current_pic_user_id - whoever currently owns the case note
        $activeCaseNotesCount = DB::table('requests')
            ->where('current_pic_user_id', $user->id)
            ->where('is_received', true)
            ->where(function($query) {
                $query->where(function($q) {
                    $q->whereIn('status', [CaseNoteRequest::STATUS_APPROVED, CaseNoteRequest::STATUS_COMPLETED])
                      ->where('is_returned', false)
                      ->where('is_rejected_return', false);
                })
                ->orWhere('is_rejected_return', true);
            })
            // Exclude case notes that have been completed (fully processed)
            ->whereNotIn('handover_status', ['completed']);

        // Log the query details for debugging
        $debugQuery = clone $activeCaseNotesCount;
        $debugResults = $debugQuery->get(['id', 'status', 'is_received', 'current_pic_user_id', 'requested_by_user_id']);

        Log::info('Dashboard active case notes query debug (includes handovers):', [
            'user_id' => $user->id,
            'user_roles' => $user->getRoleNames('api'),
            'query_conditions' => [
                'current_pic_user_id' => $user->id,
                'is_received' => true,
                'status_in' => [CaseNoteRequest::STATUS_APPROVED, CaseNoteRequest::STATUS_COMPLETED],
                'is_returned' => false,
                'is_rejected_return' => false,
                'excludes_handover_status' => ['completed']
            ],
            'debug_results_count' => $debugResults->count(),
            'debug_results' => $debugResults->map(function($result) {
                return [
                    'id' => $result->id,
                    'current_pic_user_id' => $result->current_pic_user_id,
                    'requested_by_user_id' => $result->requested_by_user_id,
                    'is_handover' => $result->current_pic_user_id != $result->requested_by_user_id
                ];
            })->toArray()
        ]);

        $activeCaseNotesCount = $activeCaseNotesCount->count();

        // Get rejected returns count - case notes that were returned by this CA but rejected by MR staff
        // Use current_pic_user_id since returned_by_user_id gets cleared when MR staff rejects
        $rejectedReturnsCount = DB::table('requests')
            ->where('current_pic_user_id', $user->id)
            ->where('is_rejected_return', true)
            ->where('status', CaseNoteRequest::STATUS_APPROVED)
            ->where('is_received', true)
            ->count();

        // Debug logging for rejected returns - check all possible rejected returns for this user
        $debugAllRejectedReturns = DB::table('requests')
            ->where('is_rejected_return', true)
            ->select(['id', 'request_number', 'status', 'is_rejected_return', 'is_received', 'returned_by_user_id', 'rejected_at', 'rejection_reason', 'current_pic_user_id', 'requested_by_user_id'])
            ->get();

        $debugUserRejectedReturns = DB::table('requests')
            ->where('returned_by_user_id', $user->id)
            ->where('is_rejected_return', true)
            ->select(['id', 'request_number', 'status', 'is_rejected_return', 'is_received', 'returned_by_user_id', 'rejected_at', 'rejection_reason'])
            ->get();

        Log::info('CA Dashboard rejected returns debug:', [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'rejected_returns_count' => $rejectedReturnsCount,
            'query_conditions' => [
                'current_pic_user_id' => $user->id,
                'is_rejected_return' => true,
                'status' => CaseNoteRequest::STATUS_APPROVED,
                'is_received' => true
            ],
            'all_rejected_returns_in_system' => $debugAllRejectedReturns->toArray(),
            'user_rejected_returns' => $debugUserRejectedReturns->toArray()
        ]);

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
            'pending_handover_verifications' => $pendingHandoverVerificationCount,
            'approved_handovers_pending_verification' => $approvedHandoversPendingVerification,

            // Handover stats - only pending handovers that CA hasn't approved/rejected yet
            'total_handovers' => $pendingHandoverCount,
            'pending_handovers' => $pendingHandoverCount,
            'completed_handovers' => 0, // Not relevant for CA dashboard

            // Active case notes
            'active_case_notes' => $activeCaseNotesCount,

            // Rejected returns count
            'rejected_returns_count' => $rejectedReturnsCount,

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
