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
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DashboardLoadingProgress } from '@/components/DashboardLoadingProgress';

import { useAuth } from '@/contexts/AuthContext';
import { requestsApi } from '@/api/requests';
import type { DashboardStats, CaseNoteRequest } from '@/types/requests';

// Status badge colors function
const getStatusBadge = (status: string) => {
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

      {/* CA-specific welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hi, {user?.name || 'Clinic Assistant'}!</h1>
      </div>

      {/* CA Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6 h-32">
                <div className="flex items-center justify-between h-full">
                  <div className="space-y-3 flex-1">
                    <Skeleton className="h-4 w-24 bg-gray-200" />
                    <Skeleton className="h-8 w-20 bg-gray-200" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full bg-gray-200" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 animate-in fade-in duration-300">
          {/* Total Requests Card */}
          <Link to="/individual-requests">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow h-32">
              <CardContent className="p-6 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Requested</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.total_requests || 0}</p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Pending Verifications Card */}
          <Link to="/verify-case-notes">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-orange-200 bg-orange-50 h-32">
              <CardContent className="p-6 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Pending Verifications</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.pending_verifications || 0}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Today's Requests Card */}
          <Link to="/individual-requests">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow h-32">
              <CardContent className="p-6 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today's Requests</p>
                    <p className="text-2xl font-bold text-green-600">{stats.today_requests || 0}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Incoming Handover Requests Card */}
          <Link to="/handover-requests">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-purple-200 bg-purple-50 h-32">
              <CardContent className="p-6 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Pending Handover Requests</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.total_handovers || 0}</p>
                  </div>
                  <ArrowRightLeft className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Active Case Notes Card */}
          <Link to="/return-case-notes">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-pink-200 bg-pink-50 h-32">
              <CardContent className="p-6 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-pink-700">Active </p>
                    <p className="text-2xl font-bold text-pink-600">{stats.active_case_notes || 0}</p>
                  </div>
                  <FolderOpen className="h-8 w-8 text-pink-400" />
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

      {/* MR Staff-specific stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6 h-32">
                <div className="flex items-center justify-between h-full">
                  <div className="space-y-3 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-300">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Active(dummy)</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.approved + stats.in_progress}</p>
                </div>
                <Activity className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="space-y-6">
        {/* Overdue Requests Alert */}
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
        )}

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
                        {getStatusBadge(request.status)}
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

      {/* Admin-specific stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6 h-32">
                <div className="flex items-center justify-between h-full">
                  <div className="space-y-3 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-300">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.total_users || 0}</p>
                </div>
                <Users className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">System Health</p>
                  <p className="text-2xl font-bold text-green-600">Good</p>
                </div>
                <Shield className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.active_sessions || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-purple-400" />
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

          // Set stats immediately
          setStats(dashboardStats);

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
