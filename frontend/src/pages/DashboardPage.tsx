import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  Activity,
  ArrowRight,
  BarChart3,
  Shield,
  XCircle,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

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
function CADashboard({ user, stats, recentRequests, loading }: any) {
    return (
    <div className="space-y-6">
      {/* CA-specific welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hi, {user?.name || 'Clinic Assistant'}!</h1>
        <p className="text-gray-600">Manage your case note requests and track patient information</p>
      </div>

      {/* CA-specific stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <Link to="/my-requests">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">My Requests</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.my_requests || 0}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.my_pending || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.my_completed || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.my_rejected || 0}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.overdue || 0}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Assigned to Me</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.handed_over_to_me || 0}</p>
                </div>
                <Users className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Handovers</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.my_handovers || 0}</p>
                </div>
                <ArrowUpRight className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CA Quick Actions */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks for Clinic Assistants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/requests/new">
                <div className="flex items-center p-3 rounded-lg border hover:bg-green-50 transition-colors">
                  <div className="p-2 rounded-lg bg-green-500 text-white mr-3">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">Create Request</h4>
                    <p className="text-xs text-gray-500">Request access to patient case notes</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </Link>

              <Link to="/requests">
                <div className="flex items-center p-3 rounded-lg border hover:bg-indigo-50 transition-colors">
                  <div className="p-2 rounded-lg bg-indigo-500 text-white mr-3">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">My Requests</h4>
                    <p className="text-xs text-gray-500">Track status of your submitted requests</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* CA Recent Requests */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>My Recent Requests</CardTitle>
                  <CardDescription>Your latest case note requests</CardDescription>
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
                    <div key={index} className="flex items-center space-x-3 p-3">
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
                  <Button asChild>
                    <Link to="/requests/new">Create Your First Request</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRequests.slice(0, 5).map((request: CaseNoteRequest) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">{request.request_number}</h4>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>{request.patient?.name}</span>
                            <span>•</span>
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(request.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(request.status)}
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/requests/${request.id}`}>View</Link>
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
            <Card key={index}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.approved + stats.in_progress}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-400" />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MR Staff Quick Actions */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks for Medical Records Staff</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/requests?status=pending">
                <div className="flex items-center p-3 rounded-lg border hover:bg-yellow-50 transition-colors">
                  <div className="p-2 rounded-lg bg-yellow-500 text-white mr-3">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">Review Pending</h4>
                    <p className="text-xs text-gray-500">Review and approve pending requests</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </Link>

              <Link to="/requests">
                <div className="flex items-center p-3 rounded-lg border hover:bg-blue-50 transition-colors">
                  <div className="p-2 rounded-lg bg-blue-500 text-white mr-3">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">All Requests</h4>
                    <p className="text-xs text-gray-500">Manage all case note requests</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </Link>

              <Link to="/reports">
                <div className="flex items-center p-3 rounded-lg border hover:bg-purple-50 transition-colors">
                  <div className="p-2 rounded-lg bg-purple-500 text-white mr-3">
                    <BarChart3 className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                    <h4 className="text-sm font-medium">Generate Reports</h4>
                    <p className="text-xs text-gray-500">Create system reports and analytics</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </Link>
            </CardContent>
          </Card>

          {stats && stats.overdue > 0 && (
            <Card className="mt-6 border-red-200 bg-red-50">
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
        </div>

        {/* MR Staff Recent Requests */}
        <div className="lg:col-span-2">
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
                    <div key={index} className="flex items-center space-x-3 p-3">
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
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
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
            <Card key={index}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  <p className="text-2xl font-bold text-blue-600">{stats.active_sessions || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-400" />
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

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);

      try {
        // Load requests first (single API call like Requests page)
        console.log('Loading requests for dashboard...');
        if (hasRole('CA')) {
          // CA users only see their own requests (filtered by backend)
          console.log('Loading CA dashboard - user will only see their own requests');
          const requestsResponse = await requestsApi.getRequests({
            page: 1,
            per_page: 100, // Get more requests to calculate accurate stats
            sort_by: 'created_at',
            sort_order: 'desc'
          });
          if (requestsResponse.success) {
            console.log('CA dashboard loaded requests:', requestsResponse.requests.data.length, 'requests');
            setRecentRequests(requestsResponse.requests.data.slice(0, 5)); // Show only 5 recent

            // Calculate stats locally from requests data (like Requests page)
            const allRequests = requestsResponse.requests.data;

            // Debug: Log the requests to see what we're working with
            console.log('Dashboard Debug - All requests for CA:', allRequests.map(r => ({
              id: r.id,
              requested_by: r.requested_by_user_id,
              current_pic: r.current_pic_user_id,
              status: r.status
            })));

            const calculatedStats = {
              total: allRequests.length,
              pending: allRequests.filter(r => r.status === 'pending').length,
              approved: allRequests.filter(r => r.status === 'approved').length,
              in_progress: allRequests.filter(r => r.status === 'in_progress').length,
              completed: allRequests.filter(r => r.status === 'completed').length,
              overdue: allRequests.filter(r => r.needed_date && new Date(r.needed_date) < new Date()).length,
              // CA-specific stats - API now only returns requests where I am the current PIC
              my_requests: allRequests.filter(r => r.requested_by_user_id === user?.id).length, // Requests I created AND am still responsible for
              my_pending: allRequests.filter(r => r.status === 'pending').length,
              my_completed: allRequests.filter(r => r.status === 'completed').length,
              my_rejected: allRequests.filter(r => r.status === 'rejected').length,
              // Handover stats
              handed_over_to_me: allRequests.filter(r => r.requested_by_user_id !== user?.id).length, // Assigned to me but not created by me
              my_handovers: 0, // Will be updated with API call below
            };

            // Debug: Log the calculated stats
            console.log('Dashboard Debug - Calculated stats:', calculatedStats);

            // Get handover statistics
            try {
              const handoverStatsResponse = await requestsApi.getHandoverStats();
              if (handoverStatsResponse.success && handoverStatsResponse.data) {
                calculatedStats.my_handovers = handoverStatsResponse.data.total_handovers;
                console.log('Dashboard Debug - Handover stats loaded:', handoverStatsResponse.data);
              }
            } catch (error) {
              console.error('Error loading handover stats:', error);
            }

            setStats(calculatedStats);
            console.log('Stats calculated locally from requests data');
          }
        } else if (hasRole('MR_STAFF') || hasRole('ADMIN')) {
          // MR Staff and Admin see all requests
          console.log('Loading MR Staff/Admin dashboard - user will see all requests');
          const requestsResponse = await requestsApi.getRequests({
            page: 1,
            per_page: 100, // Get more requests to calculate accurate stats
            sort_by: 'created_at',
            sort_order: 'desc'
          });
          if (requestsResponse.success) {
            console.log('MR Staff/Admin dashboard loaded requests:', requestsResponse.requests.data.length, 'requests');
            setRecentRequests(requestsResponse.requests.data.slice(0, 5)); // Show only 5 recent

            // Calculate stats locally from requests data
            const allRequests = requestsResponse.requests.data;
            const calculatedStats = {
              total: allRequests.length,
              pending: allRequests.filter(r => r.status === 'pending').length,
              approved: allRequests.filter(r => r.status === 'approved').length,
              in_progress: allRequests.filter(r => r.status === 'in_progress').length,
              completed: allRequests.filter(r => r.status === 'completed').length,
              overdue: allRequests.filter(r => r.needed_date && new Date(r.needed_date) < new Date()).length,
              // Role-specific stats
              ...(hasRole('MR_STAFF') && {
                total_requests: allRequests.length,
                pending_review: allRequests.filter(r => r.status === 'pending').length,
                in_progress_count: allRequests.filter(r => r.status === 'in_progress').length,
                completed_count: allRequests.filter(r => r.status === 'completed').length,
              }),
              ...(hasRole('ADMIN') && {
                total_users: 0, // Will need separate API call for this
                total_requests: allRequests.length,
                system_health: 'Good',
                active_sessions: 0, // Will need separate API call for this
              }),
            };
            setStats(calculatedStats);
            console.log('Stats calculated locally from requests data');
          }
        }
      } catch (error) {
        console.error('Dashboard load error:', error);
      } finally {
        setLoading(false);
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
    return <CADashboard user={user} stats={stats} recentRequests={recentRequests} loading={loading} />;
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
