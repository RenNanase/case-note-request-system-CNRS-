import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User,
  Building2,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  UserCheck,
  CheckCircle2,
  Play,
  History,
  Edit,
  Trash2,
  Download,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { requestsApi } from '@/api/requests';
import { useAuth } from '@/contexts/AuthContext';
import type { CaseNoteRequest, RequestEvent } from '@/types/requests';

export default function RequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, hasRole, user } = useAuth();

  const [request, setRequest] = useState<CaseNoteRequest | null>(null);
  const [timeline, setTimeline] = useState<RequestEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');

  // Load request details
  useEffect(() => {
    const loadRequest = async () => {
      if (!id) return;

      console.log('🔍 RequestDetailsPage: Loading request with ID:', id);
      console.log('🔍 RequestDetailsPage: Current user:', user);
      console.log('🔍 RequestDetailsPage: User ID type:', typeof user?.id);
      console.log('🔍 RequestDetailsPage: User roles:', user?.roles);
      console.log('🔍 RequestDetailsPage: User permissions:', user?.permissions);

      setLoading(true);
      setError(null);

      try {
        const response = await requestsApi.getRequest(parseInt(id));
        console.log('🔍 RequestDetailsPage: API response:', response);

        if (response.success) {
          setRequest(response.request);
          setTimeline(response.timeline || []);
          console.log('🔍 RequestDetailsPage: Request loaded successfully:', response.request);
        } else {
          setError('Failed to load request details');
        }
      } catch (error: any) {
        console.error('🔍 RequestDetailsPage: Load request error:', error);
        console.error('🔍 RequestDetailsPage: Error response:', error.response);
        console.error('🔍 RequestDetailsPage: Error status:', error.response?.status);
        console.error('🔍 RequestDetailsPage: Error data:', error.response?.data);

        // Handle specific error types with role-aware messages
        if (error.response?.status === 403) {
          if (hasRole('CA')) {
            setError('You do not have permission to view this request. You can only view requests that you submitted.');
          } else if (hasRole('MR_STAFF')) {
            setError('You do not have permission to view this request. Please contact your administrator if you believe this is an error.');
          } else if (hasRole('ADMIN')) {
            setError('You do not have permission to view this request. Please check your administrative privileges.');
          } else {
            setError('You do not have permission to view this request.');
          }
        } else if (error.response?.status === 404) {
          setError('Request not found. It may have been deleted or you may not have access to it.');
        } else if (error.response?.data?.message) {
          setError(error.response.data.message);
        } else {
          setError('Error loading request details. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [id, user, hasRole]);

  // Handle request actions
  const handleApprove = async () => {
    if (!request || !id) return;

    setActionLoading('approve');
    try {
      const response = await requestsApi.approveRequest(parseInt(id));
      if (response.success) {
        // Reload request details
        const updatedResponse = await requestsApi.getRequest(parseInt(id));
        if (updatedResponse.success) {
          setRequest(updatedResponse.request);
          setTimeline(updatedResponse.timeline || []);
        }
      }
    } catch (error) {
      console.error('Approve error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!request || !id) return;

    // Open the rejection modal instead of using prompt
    setShowRejectModal(true);
    setRejectReason('');
    setRejectReasonError('');
  };

  const handleRejectSubmit = async () => {
    if (!request || !id) return;

    // Validate reason
    if (!rejectReason.trim()) {
      setRejectReasonError('Please provide a reason for rejection');
      return;
    }

    setRejectReasonError('');
    setActionLoading('reject');

    try {
      const response = await requestsApi.rejectRequest(parseInt(id), rejectReason.trim());
      if (response.success) {
        // Close modal
        setShowRejectModal(false);
        setRejectReason('');

        // Reload request details
        const updatedResponse = await requestsApi.getRequest(parseInt(id));
        if (updatedResponse.success) {
          setRequest(updatedResponse.request);
          setTimeline(updatedResponse.timeline || []);
        }
      }
    } catch (error) {
      console.error('Reject error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    if (!request || !id) return;

    setActionLoading('complete');
    try {
      const response = await requestsApi.completeRequest(parseInt(id));
      if (response.success) {
        // Reload request details
        const updatedResponse = await requestsApi.getRequest(parseInt(id));
        if (updatedResponse.success) {
          setRequest(updatedResponse.request);
          setTimeline(updatedResponse.timeline || []);
        }
      }
    } catch (error) {
      console.error('Complete error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Status badge colors
  const getStatusBadge = (status: string) => {
    const statusColors = {
      'pending': { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600', bgColor: undefined },
      'approved': { variant: 'default' as const, icon: CheckCircle, color: 'text-white', bgColor: 'bg-green-600 border-green-700' },
      'in_progress': { variant: 'default' as const, icon: Play, color: 'text-purple-600', bgColor: undefined },
      'completed': { variant: 'default' as const, icon: CheckCircle2, color: 'text-green-600', bgColor: undefined },
      'rejected': { variant: 'destructive' as const, icon: XCircle, color: 'text-white', bgColor: 'bg-red-600 border-red-700' }
    };

    const config = statusColors[status as keyof typeof statusColors] || statusColors.pending;
    const Icon = config.icon;

    return (
      <Badge
        variant={config.variant}
        className={`flex items-center space-x-1 ${config.bgColor || ''}`}
      >
        <Icon className="h-3 w-3" />
        <span>{status.replace('_', ' ').toUpperCase()}</span>
      </Badge>
    );
  };

  // Priority badge colors
  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      'urgent': { variant: 'outline' as const, className: 'border-red-300 text-red-700 bg-red-50' },
      'high': { variant: 'outline' as const, className: 'border-orange-300 text-orange-700 bg-orange-50' },
      'normal': { variant: 'outline' as const, className: 'border-purple-300 text-purple-700 bg-purple-50' },
      'low': { variant: 'outline' as const, className: 'border-gray-300 text-gray-700 bg-gray-50' }
    };

    const config = priorityColors[priority.toLowerCase() as keyof typeof priorityColors] || priorityColors.normal;

    return (
      <Badge variant={config.variant} className={config.className}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;

    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-48" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    const isPermissionError = error?.includes('permission') || error?.includes('403');

    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isPermissionError ? 'Access Denied' : 'Request Not Found'}
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {error || 'The request you are looking for does not exist or you do not have permission to view it.'}
          </p>

          {isPermissionError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm text-yellow-800">
                {hasRole('CA') ? (
                  <>
                    <strong>Note:</strong> As a Clinic Assistant, you can only view requests that you submitted.
                    If you believe this is your request, please contact your administrator.
                  </>
                ) : hasRole('MR_STAFF') ? (
                  <>
                    <strong>Note:</strong> As Medical Records Staff, you should be able to view all case note requests.
                    If you're still getting this error, please contact your administrator.
                  </>
                ) : hasRole('ADMIN') ? (
                  <>
                    <strong>Note:</strong> As an Administrator, you should have access to all requests.
                    Please check your permissions or contact the system administrator.
                  </>
                ) : (
                  <>
                    <strong>Note:</strong> You do not have the necessary permissions to view this request.
                    Please contact your administrator for access.
                  </>
                )}
              </p>
            </div>
          )}

          <div className="flex justify-center space-x-4">
            <Button onClick={() => navigate('/requests')} variant="outline">
              Back to Requests
            </Button>
            {!isPermissionError && (
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: 'Requests', href: '/requests' },
            { label: `Request #${request.request_number}`, current: true }
          ]}
          className="mb-4"
        />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/requests')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Requests</span>
            </Button>

            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">
                Request #{request.request_number}
              </h1>
              {getStatusBadge(request.status)}
              {getPriorityBadge(request.priority)}

              {/* Role indicator */}
              {hasRole('MR_STAFF') && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  MR Staff View
                </Badge>
              )}
              {hasRole('CA') && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  My Request
                </Badge>
              )}
              {hasRole('ADMIN') && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  Admin View
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                {/* MR Staff Actions - Approve/Reject/Complete */}
                {hasRole('MR_STAFF') && hasPermission('approve_requests') && (
                  <>
                    {request.status === 'pending' && (
                      <>
                        <DropdownMenuItem onClick={handleApprove} disabled={actionLoading === 'approve'}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {actionLoading === 'approve' ? 'Approving...' : 'Approve Request'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleReject} disabled={actionLoading === 'reject'}>
                          <XCircle className="h-4 w-4 mr-2" />
                          {actionLoading === 'reject' ? 'Rejecting...' : 'Reject Request'}
                        </DropdownMenuItem>
                      </>
                    )}
                    {(request.status === 'approved' || request.status === 'in_progress') && (
                      <DropdownMenuItem onClick={handleComplete} disabled={actionLoading === 'complete'}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {actionLoading === 'complete' ? 'Completing...' : 'Mark Complete'}
                      </DropdownMenuItem>
                    )}
                  </>
                )}

                {/* Admin Actions - Full control */}
                {hasRole('ADMIN') && (
                  <>
                    {request.status === 'pending' && (
                      <>
                        <DropdownMenuItem onClick={handleApprove} disabled={actionLoading === 'approve'}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {actionLoading === 'approve' ? 'Approving...' : 'Approve Request'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleReject} disabled={actionLoading === 'reject'}>
                          <XCircle className="h-4 w-4 mr-2" />
                          {actionLoading === 'reject' ? 'Rejecting...' : 'Reject Request'}
                        </DropdownMenuItem>
                      </>
                    )}
                    {(request.status === 'approved' || request.status === 'in_progress') && (
                      <DropdownMenuItem onClick={handleComplete} disabled={actionLoading === 'complete'}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {actionLoading === 'complete' ? 'Completing...' : 'Mark Complete'}
                      </DropdownMenuItem>
                    )}
                  </>
                )}

                {/* CA Actions - Edit/Delete own requests */}
                {hasRole('CA') && request.status === 'pending' && request.requested_by_user_id === user?.id && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(`/requests/${id}/edit`)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Request
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Request
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Success message from navigation */}
        {location.state?.message && (
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{location.state.message}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Patient Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.patient && (
                <div className="flex items-start space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg">
                      {request.patient.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="text-gray-900">{request.patient.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">MRN</label>
                        <p className="text-gray-900">{request.patient.mrn}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">NRIC</label>
                        <p className="text-gray-900">{request.patient.nric || 'N/A'}</p>
                      </div>
                    </div>

                    {request.patient.has_medical_alerts && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>This patient has medical alerts</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Request Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Department</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{request.department?.name}</p>
                  </div>
                </div>

                {request.doctor && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Requesting Doctor</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <UserCheck className="h-4 w-4 text-gray-400" />
                      <p className="text-gray-900">{request.doctor.name}</p>
                    </div>
                  </div>
                )}

                {request.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <p className="text-gray-900">{request.location.name}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Needed By</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{formatDate(request.needed_date)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-gray-500">Purpose</label>
                <p className="text-gray-900 mt-1">{request.purpose}</p>
              </div>

              {request.remarks && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Additional Remarks</label>
                  <p className="text-gray-900 mt-1">{request.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role-Specific Information */}
          {hasRole('MR_STAFF') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserCheck className="h-5 w-5" />
                  <span>MR Staff Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Requested By</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <p className="text-gray-900">{request.requested_by?.name || 'Unknown'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Request Date</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="text-gray-900">{formatDate(request.created_at)}</p>
                    </div>
                  </div>
                </div>

                {request.status === 'pending' && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      This request is pending your review and approval. Please review the details and take appropriate action.
                    </AlertDescription>
                  </Alert>
                )}

                {request.status === 'approved' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      This request has been approved and is now in progress. The case note should be retrieved and delivered.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {hasRole('CA') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>My Request Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Submitted On</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="text-gray-900">{formatDate(request.created_at)}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Current Status</label>
                    <div className="mt-1">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                </div>

                {request.status === 'pending' && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Your request is currently under review by Medical Records staff. You will be notified once it's processed.
                    </AlertDescription>
                  </Alert>
                )}

                {request.status === 'approved' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your request has been approved! The case note is being retrieved and will be delivered to the specified location.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Request Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <div className="space-y-4">
                  {timeline.map((event, index) => {
                    // Get event color based on type with enhanced color coding
                    const getEventColor = (type: string) => {
                      switch (type) {
                        // Request-related events (purple)
                        case 'created': return 'bg-purple-500';
                        case 'handover_requested': return 'bg-purple-500';
                        case 'submitted': return 'bg-purple-500';

                        // Approved/Verified events (green)
                        case 'approved': return 'bg-green-500';
                        case 'handover_approved': return 'bg-green-500';
                        case 'handover_verified': return 'bg-green-500';
                        case 'handover_receipt_verified': return 'bg-green-500';
                        case 'returned_verified': return 'bg-green-500';
                        case 'received': return 'bg-green-500';
                        case 'acknowledged': return 'bg-green-500';
                        case 'completed': return 'bg-emerald-500';

                        // Rejected events (red)
                        case 'rejected': return 'bg-red-500';
                        case 'handover_rejected': return 'bg-red-500';
                        case 'rejected_not_received': return 'bg-red-500';
                        case 'returned_rejected': return 'bg-red-500';

                        // Transfer/Handover events (orange)
                        case 'handed_over': return 'bg-orange-500';
                        case 'status_changed': return 'bg-orange-500';

                        // Progress events (purple)
                        case 'in_progress': return 'bg-purple-500';
                        case 'updated': return 'bg-purple-500';

                        // Default
                        default: return 'bg-gray-500';
                      }
                    };

                    return (
                      <div key={`${event.id}-${index}`} className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-3 h-3 ${getEventColor(event.type)} rounded-full mt-2`}></div>
                          {index < timeline.length - 1 && (
                            <div className="w-0.5 h-12 bg-gray-200 mx-auto mt-1"></div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {event.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatRelativeTime(event.occurred_at)}
                          </p>

                          {/* Enhanced metadata display with color-coded borders */}
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div className={`mt-2 p-3 rounded-lg border-2 ${
                              event.type.includes('rejected') || event.type.includes('rejected_not_received') || event.type.includes('returned_rejected')
                                ? 'bg-red-50 border-red-200'
                                : event.type.includes('approved') || event.type.includes('verified') || event.type.includes('received') || event.type.includes('completed')
                                ? 'bg-green-50 border-green-200'
                                : event.type.includes('requested') || event.type.includes('created') || event.type.includes('submitted')
                                ? 'bg-purple-50 border-purple-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="space-y-2">
                                {/* Comments and Notes with color-coded borders */}
                                {(event.metadata.notes || event.metadata.reason || event.metadata.verification_notes ||
                                  event.metadata.completion_notes || event.metadata.approval_remarks ||
                                  event.metadata.rejection_reason || event.metadata.handover_reason) && (
                                  <div className={`bg-white p-2 rounded border-l-4 ${
                                    event.type.includes('rejected') || event.type.includes('rejected_not_received') || event.type.includes('returned_rejected')
                                      ? 'border-red-400'
                                      : event.type.includes('approved') || event.type.includes('verified') || event.type.includes('received') || event.type.includes('completed')
                                      ? 'border-green-400'
                                      : event.type.includes('requested') || event.type.includes('created') || event.type.includes('submitted')
                                      ? 'border-purple-400'
                                      : 'border-purple-400'
                                  }`}>
                                    <span className="text-xs font-medium text-gray-600 block mb-1">Comments:</span>
                                    <p className="text-sm text-gray-700">
                                      {event.metadata.notes || event.metadata.reason || event.metadata.verification_notes ||
                                       event.metadata.completion_notes || event.metadata.approval_remarks ||
                                       event.metadata.rejection_reason || event.metadata.handover_reason}
                                    </p>
                                  </div>
                                )}

                                {/* Doctor Information */}
                                {(event.metadata.doctor_name || event.metadata.handover_doctor_name || event.metadata.new_doctor_name) && (
                                  <div className="bg-white p-2 rounded border-l-2 border-green-300">
                                    <span className="text-xs font-medium text-gray-600 block mb-1">Doctor:</span>
                                    <p className="text-sm text-gray-700">
                                      {event.metadata.doctor_name || event.metadata.handover_doctor_name || event.metadata.new_doctor_name}
                                    </p>
                                  </div>
                                )}

                                {/* Department Information */}
                                {(event.metadata.department_name || event.metadata.new_department_name) && (
                                  <div className="bg-white p-2 rounded border-l-2 border-purple-300">
                                    <span className="text-xs font-medium text-gray-600 block mb-1">Department:</span>
                                    <p className="text-sm text-gray-700">
                                      {event.metadata.department_name || event.metadata.new_department_name}
                                    </p>
                                  </div>
                                )}

                                {/* Location Information */}
                                {event.metadata.location_name && event.metadata.location_name !== 'No specific location' && (
                                  <div className="bg-white p-2 rounded border-l-2 border-orange-300">
                                    <span className="text-xs font-medium text-gray-600 block mb-1">Location:</span>
                                    <p className="text-sm text-gray-700">{event.metadata.location_name}</p>
                                  </div>
                                )}

                                {/* Transfer Information */}
                                {(event.metadata.from_user || event.metadata.to_user ||
                                  event.metadata.handed_over_from_user_name || event.metadata.handed_over_to_user_name) && (
                                  <div className="bg-white p-2 rounded border-l-2 border-indigo-300">
                                    <span className="text-xs font-medium text-gray-600 block mb-1">Transfer:</span>
                                    <p className="text-sm text-gray-700">
                                      {event.metadata.from_user || event.metadata.handed_over_from_user_name} → {event.metadata.to_user || event.metadata.handed_over_to_user_name}
                                    </p>
                                  </div>
                                )}

                                {/* Status Changes */}
                                {(event.metadata.old_status || event.metadata.new_status) && (
                                  <div className="bg-white p-2 rounded border-l-2 border-yellow-300">
                                    <span className="text-xs font-medium text-gray-600 block mb-1">Status Change:</span>
                                    <p className="text-sm text-gray-700">
                                      {event.metadata.old_status} → {event.metadata.new_status}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}




                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No timeline events yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Status Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                {getStatusBadge(request.status)}
              </div>

         

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm text-gray-900">{formatDate(request.created_at)}</span>
              </div>

              {request.approved_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Approved</span>
                  <span className="text-sm text-gray-900">{formatDate(request.approved_at)}</span>
                </div>
              )}

              {request.completed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Completed</span>
                  <span className="text-sm text-gray-900">{formatDate(request.completed_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Information */}
          <Card>
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Request Number</label>
                <p className="text-gray-900 font-mono">{request.request_number}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Requested By</label>
                <p className="text-gray-900">{request.requested_by?.name}</p>
                <p className="text-sm text-gray-500">{request.requested_by?.email}</p>
              </div>

              {request.approved_by && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Approved By</label>
                  <p className="text-gray-900">{request.approved_by.name}</p>
                </div>
              )}

              {request.completed_by && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Completed By</label>
                  <p className="text-gray-900">{request.completed_by.name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {request.can_be_approved && hasPermission('approve_requests') && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleApprove}
                  disabled={actionLoading === 'approve'}
                  className="w-full"
                  variant="default"
                >
                  {actionLoading === 'approve' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Request
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleReject}
                  disabled={actionLoading === 'reject'}
                  className="w-full"
                  variant="destructive"
                >
                  {actionLoading === 'reject' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Request
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {request.can_be_completed && hasPermission('approve_requests') && (
            <Card>
              <CardHeader>
                <CardTitle>Complete Request</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleComplete}
                  disabled={actionLoading === 'complete'}
                  className="w-full"
                  variant="default"
                >
                  {actionLoading === 'complete' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Handover functionality has been removed */}
        </div>
      </div>

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
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim() || actionLoading === 'reject'}
              >
                {actionLoading === 'reject' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
