import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Calendar,
  User,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { requestsApi } from '@/api/requests';
import { useAuth } from '@/contexts/AuthContext';
import type { CaseNoteRequest, RequestsListParams } from '@/types/requests';

export default function RequestsPage() {
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();

  // Redirect MR Staff to their specialized page
  useEffect(() => {
    if (hasRole('MR_STAFF')) {
      navigate('/mrs-case-note-requests', { replace: true });
      return;
    }
  }, [hasRole, navigate]);

  const [requests, setRequests] = useState<CaseNoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null);

  // Load requests
  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true);
      setError(null);

      try {
        const params: RequestsListParams = {
          page: 1,
          per_page: 20,
          search: searchQuery || undefined,
          sort_by: 'created_at',
          sort_order: 'desc'
        };

        const response = await requestsApi.getRequests(params);
        if (response.success) {
          setRequests(response.requests.data);
          setTotalCount(response.requests.total);
        } else {
          setError('Failed to load requests');
        }
      } catch (error) {
        setError('Error loading requests. Please try again.');
        console.error('Load requests error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, [searchQuery]);

  // Handle request actions (approve, reject, complete)
  const handleRequestAction = async (requestId: number, action: 'approve' | 'reject' | 'complete', data?: any) => {
    if (actionLoading === requestId) return;

    setActionLoading(requestId);

    try {
      let response;

      switch (action) {
        case 'approve':
          response = await requestsApi.approveRequest(requestId, data?.remarks);
          break;
        case 'reject':
          response = await requestsApi.rejectRequest(requestId, data?.reason);
          break;
        case 'complete':
          response = await requestsApi.completeRequest(requestId, data?.notes);
          break;
        default:
          throw new Error('Invalid action');
      }

      if (response.success) {
        // Reload the requests to show updated status
        const refreshResponse = await requestsApi.getRequests({
          page: 1,
          per_page: 20,
          search: searchQuery || undefined,
          sort_by: 'created_at',
          sort_order: 'desc'
        });

        if (refreshResponse.success) {
          setRequests(refreshResponse.requests.data);
          setTotalCount(refreshResponse.requests.total);
        }

        // Show success message (you can implement a toast here)
        console.log(`Request ${action}d successfully`);
      } else {
        console.error(`Failed to ${action} request:`, response.message);
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle approve request
  const handleApprove = (requestId: number) => {
    const remarks = prompt('Enter approval remarks (optional):');
    if (remarks !== null) {
      handleRequestAction(requestId, 'approve', { remarks });
    }
  };

  // Handle reject request
  const handleReject = (requestId: number) => {
    setRejectingRequestId(requestId);
    setShowRejectModal(true);
    setRejectReason('');
    setRejectReasonError('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectingRequestId) return;

    // Validate reason
    if (!rejectReason.trim()) {
      setRejectReasonError('Please provide a reason for rejection');
      return;
    }

    setRejectReasonError('');

    try {
      const response = await requestsApi.rejectRequest(rejectingRequestId, rejectReason.trim());
      if (response.success) {
        // Close modal
        setShowRejectModal(false);
        setRejectReason('');
        setRejectingRequestId(null);

        // Reload the requests to show updated status
        const refreshResponse = await requestsApi.getRequests({
          page: 1,
          per_page: 20,
          search: searchQuery || undefined,
          sort_by: 'created_at',
          sort_order: 'desc'
        });

        if (refreshResponse.success) {
          setRequests(refreshResponse.requests.data);
          setTotalCount(refreshResponse.requests.total);
        }

        console.log('Request rejected successfully');
      } else {
        console.error('Failed to reject request:', response.message);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  // Handle complete request
  const handleComplete = (requestId: number) => {
    const notes = prompt('Enter completion notes (optional):');
    if (notes !== null) {
      handleRequestAction(requestId, 'complete', { notes });
    }
  };

  // Status badge colors
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

  // Priority badge colors
  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      'urgent': { className: 'bg-red-100 text-red-800 border-red-200' },
      'high': { className: 'bg-green-100 text-green-800 border-green-200' },
      'normal': { className: 'bg-purple-100 text-purple-800 border-purple-200' },
      'low': { className: 'bg-gray-100 text-gray-800 border-gray-200' }
    };

    const config = priorityColors[priority.toLowerCase() as keyof typeof priorityColors] || priorityColors.normal;

    return (
      <Badge variant="outline" className={config.className}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };



  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {hasRole('MR_STAFF') ? 'Medical Records - Case Note Requests' : 'My Case Note Requests'}
          </h1>
          <p className="text-gray-600 mt-2">
            {hasRole('MR_STAFF')
              ? 'Review, approve, and manage case note requests from Clinic Assistants'
              : 'Track the status of your submitted case note requests'
            }
          </p>
        </div>

        {hasPermission('create_requests') && (
          <Button asChild>
            <Link to="/requests/new" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create Request</span>
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {hasRole('MR_STAFF') ? 'Total Requests' : 'My Requests'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
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
                <p className="text-2xl font-bold text-yellow-600">
                  {requests.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {hasRole('MR_STAFF') ? 'In Progress' : 'Approved'}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {requests.filter(r => ['approved', 'in_progress'].includes(r.status)).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {requests.filter(r => r.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {requests.filter(r => r.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-orange-600">
                  {requests.filter(r => r.needed_date && new Date(r.needed_date) < new Date()).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search requests by patient name, MRN, or request number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {hasRole('MR_STAFF') && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Pending ({requests.filter(r => r.status === 'pending').length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  In Progress ({requests.filter(r => ['approved', 'in_progress'].includes(r.status)).length})
                </Button>
              </div>
            )}

            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {hasRole('MR_STAFF') ? 'All Requests' : 'My Requests'} ({totalCount})
          </CardTitle>
          <CardDescription>
            {hasRole('MR_STAFF')
              ? 'Case note requests from all Clinic Assistants requiring review and approval'
              : 'Your case note requests and their current status'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-2">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Try Again
              </Button>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'No requests found matching your search.' : 'No requests found.'}
              </p>
              {hasPermission('create_requests') && !searchQuery && (
                <Button asChild>
                  <Link to="/requests/new">Create Your First Request</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                    hasRole('MR_STAFF') && request.priority === 'urgent'
                      ? 'border-red-300 bg-red-50'
                      : hasRole('MR_STAFF') && request.status === 'pending'
                      ? 'border-yellow-300 bg-yellow-50'
                      : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-purple-100 text-purple-700">
                        <FileText className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-3">
                        <h3
                          className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-purple-600 transition-colors"
                          onClick={() => navigate(`/requests/${request.id}`)}
                          title="Click to view details"
                        >
                          {request.request_number}
                        </h3>
                        {getStatusBadge(request.status)}
                        {getPriorityBadge(request.priority)}
                        {request.is_overdue && (
                          <Badge variant="destructive" className="flex items-center space-x-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>OVERDUE</span>
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        {request.patient && (
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>{request.patient.name}</span>
                          </div>
                        )}
                        {request.department && (
                          <div className="flex items-center space-x-1">
                            <Building2 className="h-4 w-4" />
                            <span>{request.department.name}</span>
                          </div>
                        )}
                        {hasRole('MR_STAFF') && request.requested_by && (
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>By: {request.requested_by.name}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Created {formatDate(request.created_at)}</span>
                        </div>
                        {request.needed_date && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>Needed by {formatDate(request.needed_date)}</span>
                          </div>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {request.purpose}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/requests/${request.id}`)}
                    >
                      View
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/requests/${request.id}`)}>
                          View Details
                        </DropdownMenuItem>
                        {request.can_be_approved && hasPermission('approve_requests') && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleApprove(request.id)}
                              disabled={actionLoading === request.id}
                              className="text-green-600"
                            >
                              {actionLoading === request.id ? (
                                <div className="flex items-center space-x-2">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                                  <span>Approving...</span>
                                </div>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve Request
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleReject(request.id)}
                              disabled={actionLoading === request.id}
                              className="text-red-600"
                            >
                              {actionLoading === request.id ? (
                                <div className="flex items-center space-x-2">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                  <span>Rejecting...</span>
                                </div>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject Request
                                </>
                              )}
                            </DropdownMenuItem>
                          </>
                        )}
                        {request.can_be_completed && hasPermission('approve_requests') && (
                          <DropdownMenuItem
                            onClick={() => handleComplete(request.id)}
                            disabled={actionLoading === request.id}
                            className="text-purple-600"
                          >
                            {actionLoading === request.id ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                                <span>Completing...</span>
                              </div>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark Complete
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Request</h3>
            <p className="text-sm text-gray-700 mb-4">
              Please provide a reason for rejecting this request.
            </p>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
            />
            {rejectReasonError && (
              <p className="text-red-500 text-sm mb-4">{rejectReasonError}</p>
            )}
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setRejectReasonError('');
                  setRejectingRequestId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim()}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
