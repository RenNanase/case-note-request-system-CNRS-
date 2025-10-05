import { useState, useEffect, useCallback } from 'react';
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
  Printer,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MoreVertical,
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  Share2,
  Tag,
  UserPlus,
  AlertCircle,
  Loader2,
  RefreshCw
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

type UserRole = 'ADMIN' | 'MR_STAFF' | 'CA' | 'DOCTOR';

// Extend the CaseNoteRequest interface to include events and make request_number required
interface ExtendedCaseNoteRequest extends Omit<CaseNoteRequest, 'events' | 'request_number'> {
  events?: RequestEvent[];
  request_number: string;
}

// Types are now imported from @/types/requests

// Status badge component
const getStatusBadge = (status: string) => {
  const statusColors = {
    'pending': {
      icon: Clock,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
      text: 'PENDING'
    },
    'approved': {
      icon: CheckCircle,
      className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
      text: 'APPROVED'
    },
    'in_progress': {
      icon: Clock,
      className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100',
      text: 'IN PROGRESS'
    },
    'completed': {
      icon: CheckCircle,
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
      text: 'COMPLETED'
    },
    'rejected': {
      icon: XCircle,
      className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
      text: 'REJECTED'
    },
    'returned': {
      icon: AlertTriangle,
      className: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100',
      text: 'RETURNED'
    }
  };

  const config = statusColors[status as keyof typeof statusColors] || statusColors.pending;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      <span>{config.text}</span>
    </Badge>
  );
};

const RequestDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string; message?: string } };
  const { user, hasRole } = useAuth();
  const [request, setRequest] = useState<ExtendedCaseNoteRequest | null>(null);
  const [timeline, setTimeline] = useState<RequestEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check if user has permission
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // Add your permission logic here
    return hasRole('ADMIN') || hasRole('MR_STAFF');
  };
  // State for expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    patient: true,
    request: true,
    timeline: true
  });

  const canEdit = useCallback((): boolean => {
    if (!user || !request) return false;
    return (
      hasRole('ADMIN') ||
      (hasRole('CA') && request.status === 'pending' && request.requested_by_user_id === user.id)
    );
  }, [user, request, hasRole]);

  const canApproveReject = useCallback(() => {
    if (!user) return false;
    return hasRole('ADMIN') || hasRole('MR_STAFF');
  }, [user, hasRole]);

  const canComplete = useCallback(() => {
    if (!user || !request) return false;
    return (
      hasRole('ADMIN') ||
      hasRole('MR_STAFF') ||
      (hasRole('CA') &&
       (request.status === 'approved' || request.status === 'in_progress') &&
       request.current_pic_user_id === user.id)
    );
  }, [user, request, hasRole]);

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');

  // Load request details
  useEffect(() => {
    const loadRequest = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const response = await requestsApi.getRequest(parseInt(id));
        if (response.success) {
          setRequest(response.request);

          // Load timeline events to match MR-side timeline view
          try {
            const timelineResp = await requestsApi.getCaseNoteTimeline(response.request.id);
            const rawEvents = (timelineResp as any)?.events || [];
            // Normalize events to expected MR-style shape
            const normalized = rawEvents.map((ev: any) => ({
              id: ev.id,
              type: ev.type || ev.event_type || 'unknown',
              description: ev.description || ev.reason || ev.message || '',
              occurred_at: ev.occurred_at || ev.created_at || ev.timestamp || ev.updated_at,
              metadata: ev.metadata || {}
            }));

            if (normalized.length > 0) {
              setTimeline(normalized);
            } else {
              // Fallback: use events embedded in request (if provided by details API)
              const embedded = (response.request as any)?.events || [];
              const normalizedEmbedded = embedded.map((ev: any) => ({
                id: ev.id,
                type: ev.type || ev.event_type || 'unknown',
                description: ev.description || ev.reason || '',
                occurred_at: ev.occurred_at || ev.created_at,
                metadata: ev.metadata || {}
              }));
              setTimeline(normalizedEmbedded);
            }
          } catch (e) {
            console.error('Error loading timeline:', e);
            // Fallback on error as well
            const embedded = (response.request as any)?.events || [];
            const normalizedEmbedded = embedded.map((ev: any) => ({
              id: ev.id,
              type: ev.type || ev.event_type || 'unknown',
              description: ev.description || ev.reason || '',
              occurred_at: ev.occurred_at || ev.created_at,
              metadata: ev.metadata || {}
            }));
            setTimeline(normalizedEmbedded);
          }
        } else {
          setError('Failed to load request details');
        }
      } catch (error: any) {
        console.error('Load request error:', error);
        setError('Error loading request details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [id]);

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
      const response = await requestsApi.rejectRequest(parseInt(id), { rejection_reason: rejectReason.trim() });
      if (response.success) {
        // Close modal
        setShowRejectModal(false);
        setRejectReason('');

        // Reload request details
        const updatedResponse = await requestsApi.getRequest(parseInt(id));
        if (updatedResponse.success) {
          setRequest(updatedResponse.request);
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
        }
      }
    } catch (error) {
      console.error('Complete error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Format date with time
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format relative time (e.g., '2 hours ago')
  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format created at date
  const formattedDate = request?.created_at
    ? new Date(request.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'N/A';

  // Handle print
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      // Get the current date and time
      const now = new Date();
      const formattedDate = now.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Create print content
      let printContent = `
        <html>
          <head>
            <title>Request #${request?.request_number || 'Details'}</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              @media print {
                @page { margin: 1cm; }
                body { font-family: Arial, sans-serif; }
                .no-print { display: none; }
                .print-section { margin-bottom: 1.5rem; }
                .print-header { margin-bottom: 1.5rem; }
                .print-title { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
                .print-subtitle { font-size: 1.1rem; color: #4b5563; margin-bottom: 1.5rem; }
                .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                .print-divider { border-top: 1px solid #e5e7eb; margin: 1rem 0; }
              }
            </style>
          </head>
          <body class="p-6">
            <div class="print-header">
              <h1 class="print-title">Case Note Request Details</h1>
              <div class="print-subtitle">Generated on ${formattedDate}</div>
              <div class="print-divider"></div>
            </div>

            <div class="print-grid">
              <!-- Patient Details -->
              <div class="print-section">
                <h2 class="font-semibold text-lg mb-3">Patient Information</h2>
                <div class="space-y-2">
                  <div><span class="text-gray-600">Name:</span> ${request?.patient?.name || 'N/A'}</div>
                  <div><span class="text-gray-600">MRN:</span> ${request?.patient?.mrn || 'N/A'}</div>
                  <div><span class="text-gray-600">DOB:</span> ${request?.patient?.date_of_birth || 'N/A'}</div>
                  <div><span class="text-gray-600">Gender:</span> ${request?.patient?.gender || 'N/A'}</div>
                </div>
              </div>

              <!-- Request Details -->
              <div class="print-section">
                <h2 class="font-semibold text-lg mb-3">Request Information</h2>
                <div class="space-y-2">
                  <div><span class="text-gray-600">Request #:</span> ${request?.request_number || 'N/A'}</div>
                  <div><span class="text-gray-600">Status:</span> ${request?.status ? request.status.replace('_', ' ').toUpperCase() : 'N/A'}</div>
                  <div><span class="text-gray-600">Created:</span> ${formattedDate}</div>
                  <div><span class="text-gray-600">Department:</span> ${request?.department?.name || 'N/A'}</div>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load before printing
      printWindow.onload = function() {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    } else {
      // Fallback to default print if popup is blocked
      window.print();
    }
  };

  // Handle export
  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!id || !request) return;

    try {
      setActionLoading(`export-${format}`);
      const response = await requestsApi.exportRequest(parseInt(id), format);

      if (!response?.data) {
        throw new Error('No data received');
      }

      // Create a blob URL for the downloaded file
      const blob = new Blob([response.data as unknown as BlobPart], {
        type: 'application/octet-stream'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `request-${request?.request_number || id}.${format}`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

    } catch (error) {
      console.error('Export error:', error);
      // You might want to show a toast notification here
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle section visibility
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>Request not found or you do not have access.</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate(-1)}>Back to List</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">


      {/* Main content */}
      <div className="grid gap-6">
        {/* Removed duplicate Patient/Request details cards (using consolidated layout below) */}

        {/* Removed legacy Activity Timeline block to standardize on MR-style timeline below */}

        {/* Removed action buttons including Back to List and Mark as Complete per request */}

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
                        case 'Acknowledge': return 'bg-green-500';
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
                <p className="text-gray-900 font-mono">{request?.request_number || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Requested By</label>
                <p className="text-gray-900">{request.requested_by?.name}</p>
              </div>

              {request.approved_by && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Received By</label>
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
                  className="w-full bg-green-600 hover:bg-green-700"
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

          {/* Removed Complete Request quick action card */}

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
}; // End of RequestDetailsPage component

export default RequestDetailsPage;

