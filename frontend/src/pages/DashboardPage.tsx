import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  Activity,
  ArrowRightLeft,
  Shield,
  XCircle,
  FolderOpen,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DashboardLoadingProgress } from '@/components/DashboardLoadingProgress';


import { useAuth } from '@/contexts/AuthContext';
import { requestsApi } from '@/api/requests';
import type { DashboardStats, CaseNoteRequest } from '@/types/requests';

// Status badge component
const getStatusBadge = (status: string, isRejectedReturn?: boolean) => {
  // Check for rejected return status first
  if (isRejectedReturn) {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
        <XCircle className="h-3 w-3" />
        <span>REJECTED RETURN</span>
      </Badge>
    );
  }

  const statusColors = {
    'pending': { icon: Clock, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'approved': { icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-200' },
    'in_progress': { icon: Clock, className: 'bg-purple-100 text-purple-800 border-purple-200' },
    'completed': { icon: CheckCircle, className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    'rejected': { icon: XCircle, className: 'bg-red-100 text-red-800 border-red-200' }
  };

  const config = statusColors[status as keyof typeof statusColors] || statusColors.pending;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`flex items-center space-x-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      <span>{status.replace('_', ' ').toUpperCase()}</span>
    </Badge>
  );
};

// CA Dashboard Component
function CADashboard({ user, stats, loading, loadingProgress, executionTime, cached }: any) {
    return (
    <div className="space-y-6">
      {/* Loading Progress */}
      <DashboardLoadingProgress
        progress={loadingProgress}
        executionTime={executionTime}
        cached={cached}
      />




      {/* Banner notification for pending verifications */}
      {stats && stats.pending_verifications > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-orange-800">
                You have case notes pending verification
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                {stats.pending_verifications} case note{stats.pending_verifications > 1 ? 's' : ''} need{stats.pending_verifications === 1 ? 's' : ''} to be verified as received.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link to="/verify-case-notes">
                <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                  Verify Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Debug logging for rejected returns */}
      {console.log('Dashboard stats for rejected returns:', {
        stats: stats,
        rejected_returns_count: stats?.rejected_returns_count,
        hasStats: !!stats,
        shouldShowBanner: stats && stats.rejected_returns_count > 0
      })}

      {/* Banner notification for rejected returns */}
      {stats && stats.rejected_returns_count > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                You have rejected case notes that need to be re-returned
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {stats.rejected_returns_count} case note{stats.rejected_returns_count > 1 ? 's' : ''} {stats.rejected_returns_count === 1 ? 'was' : 'were'} rejected by MR staff and need{stats.rejected_returns_count === 1 ? 's' : ''} to be returned again.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link to="/return-case-notes">
                <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                  Re-return Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Banner notification for unAcknowledge send-outs */}
      {stats && stats.unAcknowledge_sendouts_count > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                You have received send-out case notes that need acknowledgement
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                {stats.unAcknowledge_sendouts_count} send-out case note{stats.unAcknowledge_sendouts_count > 1 ? 's' : ''} {stats.unAcknowledge_sendouts_count === 1 ? 'has' : 'have'} been sent to you and {stats.unAcknowledge_sendouts_count === 1 ? 'needs' : 'need'} to be Acknowledge.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link to="/send-out-case-notes">
                <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                  Acknowledge Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Banner notification for pending handover verifications */}
      {stats && stats.pending_handover_verifications > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                You have case notes pending handover verification
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {stats.pending_handover_verifications} handover case note{stats.pending_handover_verifications > 1 ? 's' : ''} request requires your approval or rejection.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link to="/handover-requests">
                <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                  Review Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Banner notification for approved handovers pending verification */}
      {stats && stats.approved_handovers_pending_verification > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-purple-800">
                You have approved handover case notes pending for verification
              </h3>
              <p className="text-sm text-purple-700 mt-1">
                {stats.approved_handovers_pending_verification} case note{stats.approved_handovers_pending_verification > 1 ? 's' : ''} that you requested for handover {stats.approved_handovers_pending_verification === 1 ? 'has' : 'have'} been approved and {stats.approved_handovers_pending_verification === 1 ? 'needs' : 'need'} to be verified.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link to="/verify-case-notes">
                <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-100">
                  Verify Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* CA-specific welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hi, {user?.name || 'Clinic Assistant'}!</h1>
      </div>

      {/* CA Stats Cards - Modern KPI Layout */}
      {loading ? (
        <div className="grid grid-cols-5 gap-4 overflow-x-auto hide-scrollbar">
          {[...Array(5)].map((_, index) => (
            <Card key={index} className="animate-pulse h-24 min-w-[200px] flex-shrink-0">
              <CardContent className="p-4 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-3 w-20 bg-gray-200" />
                    <Skeleton className="h-6 w-12 bg-gray-200" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg bg-gray-200 ml-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-5 gap-4 overflow-x-auto hide-scrollbar animate-in fade-in duration-300">
          {/* Total Requests Card */}
          <Link to="/my-requests" className="group">
            <Card className="cursor-pointer h-28 bg-white border shadow-sm hover:shadow-md hover:border-purple-300 transition-all duration-200 group-hover:scale-105">
              <CardContent className="p-6 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600 group-hover:text-purple-600 transition-colors">Total Requested</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_requests || 0}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

        {/* Pending Verifications Card */}
        <Link to="/verify-case-notes" className="group">
          <Card className="cursor-pointer h-28 bg-white border shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-200 group-hover:scale-105">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600 group-hover:text-orange-600 transition-colors">Pending Verifications</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_verifications || 0}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

          {/* Today's Requests Card */}
          <Link to="/my-requests" className="group">
            <Card className="cursor-pointer h-28 bg-white border shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-200 group-hover:scale-105">
              <CardContent className="p-6 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600 group-hover:text-green-600 transition-colors">Today's Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.today_requests || 0}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Handover Requests Card */}
          <Link to="/handover-requests" className="group">
            <Card className="cursor-pointer h-28 bg-white border shadow-sm hover:shadow-md hover:border-purple-300 transition-all duration-200 group-hover:scale-105">
              <CardContent className="p-6 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600 group-hover:text-purple-600 transition-colors">Handover Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_handovers || 0}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                    <ArrowRightLeft className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Active Case Notes Card */}
          <Link to="/return-case-notes" className="group">
            <Card className="cursor-pointer h-28 bg-white border shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-200 group-hover:scale-105">
              <CardContent className="p-6 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600 group-hover:text-green-600 transition-colors">Active Cases</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.active_case_notes || 0}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                    <FolderOpen className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

// MR Staff Dashboard Component
function MRStaffDashboard({ user, stats, recentRequests, loading }: any) {
  return (
    <div className="space-y-6">
      {/* MR Staff-specific welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hi, {user?.name || 'Medical Records Staff'}!</h1>
        <p className="text-gray-600">Review pending requests and manage case note workflows</p>
      </div>

      {/* MR Staff-specific stats - Modern KPI Layout */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4 overflow-x-auto hide-scrollbar">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="animate-pulse h-24 min-w-[220px] flex-shrink-0">
              <CardContent className="p-4 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-3 w-20 bg-gray-200" />
                    <Skeleton className="h-6 w-12 bg-gray-200" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg bg-gray-200 ml-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-5 gap-4 overflow-x-auto hide-scrollbar animate-in fade-in duration-300">
          <Card className="h-28 bg-white border shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-28 bg-white border shadow-sm hover:shadow-md hover:border-yellow-300 transition-all duration-200 hover:scale-105">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-28 bg-white border shadow-sm hover:shadow-md hover:border-red-300 transition-all duration-200 hover:scale-105">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Not Returned to MR</p>
                  <p className="text-2xl font-bold text-red-600">{stats.not_returned_count || 0}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-28 bg-white border shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-200 hover:scale-105">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-28 bg-white border shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-200 hover:scale-105">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.rejected_count || 0}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <XCircle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

    <div className="space-y-6">
        {/* Overdue Requests Alert
        {stats && stats.overdue > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-900 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Overdue Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-800 text-sm mb-3">
                You have {stats.overdue} overdue request{stats.overdue !== 1 ? 's' : ''} that need attention.
              </p>
              <Button asChild variant="outline" size="sm" className="text-red-700 border-red-300 hover:bg-red-100">
                <Link to="/requests?overdue=true">Review Overdue</Link>
              </Button>
            </CardContent>
          </Card>
        )} */}

        {/* MR Staff Recent Requests */}
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Requests</CardTitle>
                  <CardDescription>Latest case note requests requiring attention</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/requests">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 animate-pulse">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentRequests.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No requests found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRequests.slice(0, 5).map((request: CaseNoteRequest) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <FileText className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">{request.request_number}</h4>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>{request.patient?.name}</span>
                            <span>•</span>
                            <span>{request.requested_by?.name}</span>
                            <span>•</span>
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(request.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(request.status, request.is_rejected_return)}
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/requests/${request.id}`}>Review</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Admin Dashboard Component
function AdminDashboard({ user, stats, loading }: any) {
  return (
    <div className="space-y-6">
      {/* Admin-specific welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hi, {user?.name || 'Administrator'}!</h1>
        <p className="text-gray-600">Full system access and administrative controls</p>
      </div>

      {/* Admin-specific stats - Modern KPI Layout */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4 overflow-x-auto hide-scrollbar">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="animate-pulse h-24 min-w-[220px] flex-shrink-0">
              <CardContent className="p-4 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-3 w-20 bg-gray-200" />
                    <Skeleton className="h-6 w-12 bg-gray-200" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg bg-gray-200 ml-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-4 gap-4 overflow-x-auto hide-scrollbar animate-in fade-in duration-300">
          <Card className="h-28 bg-white border shadow-sm hover:shadow-md hover:border-purple-300 transition-all duration-200 hover:scale-105">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_users || 0}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-28 bg-white border shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 hover:scale-105">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-28 bg-white border shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-200 hover:scale-105">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">System Health</p>
                  <p className="text-2xl font-bold text-gray-900">Good</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-28 bg-white border shadow-sm hover:shadow-md hover:border-purple-300 transition-all duration-200 hover:scale-105">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active_sessions || 0}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRequests, setRecentRequests] = useState<CaseNoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState<number | undefined>();
  const [cached, setCached] = useState<boolean | undefined>();
  const [lastStatsUpdate, setLastStatsUpdate] = useState<number>(0);

  // Load dashboard data with progressive loading
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setLoadingProgress(0);

      try {
        console.log('Loading optimized dashboard data...');

        // Use the new optimized dashboard API
        const dashboardResponse = await requestsApi.getOptimizedDashboardStats();
        setLoadingProgress(50);

                                if (dashboardResponse.success) {
          const dashboardStats = dashboardResponse.data;
          console.log('Dashboard stats loaded:', dashboardStats);

          // Debug: Log the dashboard stats to see if pending_handover_verifications is present
          const timestamp = Date.now();
          console.log('Dashboard stats received at:', new Date(timestamp).toISOString(), dashboardStats);
          console.log('Pending handover verifications:', dashboardStats.pending_handover_verifications);
          console.log('Last update was:', lastStatsUpdate ? new Date(lastStatsUpdate).toISOString() : 'never');

          // Ensure pending_handover_verifications is properly handled
          if (dashboardStats.pending_handover_verifications === undefined || dashboardStats.pending_handover_verifications === null) {
            console.warn('pending_handover_verifications is undefined/null, setting to 0');
            dashboardStats.pending_handover_verifications = 0;
          }

          // Set stats with timestamp tracking
          setStats(dashboardStats);
          setLastStatsUpdate(timestamp);

          // Capture performance metrics
          if (dashboardResponse.execution_time_ms) {
            setExecutionTime(dashboardResponse.execution_time_ms);
          }
          if (dashboardResponse.cached !== undefined) {
            setCached(dashboardResponse.cached);
          }

          setLoadingProgress(80);

          // Load recent requests if needed (only for MR Staff/Admin)
          if (hasRole('MR_STAFF') || hasRole('ADMIN')) {
            try {
              const recentRequestsResponse = await requestsApi.getRequests({
                page: 1,
                per_page: 5,
                sort_by: 'created_at',
                sort_order: 'desc'
              });

              if (recentRequestsResponse.success) {
                setRecentRequests(recentRequestsResponse.requests.data || []);
              }
            } catch (error) {
              console.error('Error loading recent requests:', error);
            }
          }

          setLoadingProgress(100);

          // For cached responses, hide loading immediately for better UX
          if (dashboardResponse.cached) {
            setLoading(false);
            setLoadingProgress(0);
          } else {
            // Small delay only for fresh data to show progress completion
            setTimeout(() => {
              setLoading(false);
              setLoadingProgress(0);
            }, 100);
          }
        } else {
          console.error('Dashboard API response not successful:', dashboardResponse);
          setLoading(false);
          setLoadingProgress(0);
        }
      } catch (error) {
        console.error('Dashboard load error:', error);
        setLoading(false);
        setLoadingProgress(0);
      }
    };

    loadDashboardData();
  }, [hasRole]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Skeleton className="h-4 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  if (hasRole('CA')) {
    return <CADashboard
      user={user}
      stats={stats}
      recentRequests={recentRequests}
      loading={loading}
      loadingProgress={loadingProgress}
      executionTime={executionTime}
      cached={cached}
    />;
  } else if (hasRole('MR_STAFF')) {
    return <MRStaffDashboard user={user} stats={stats} recentRequests={recentRequests} loading={loading} />;
  } else if (hasRole('ADMIN')) {
    return <AdminDashboard user={user} stats={stats} recentRequests={recentRequests} loading={loading} />;
  }

  // Fallback for users without specific roles
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome to the CNRS dashboard</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-600">
            <p>No specific role assigned. Please contact your administrator.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
