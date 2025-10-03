import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  ArrowUpRight,
  Search,
  Filter,
  Calendar,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { requestsApi } from '@/api/requests';
import { HandoverRequestModal } from '@/components/modals/HandoverRequestModal';
import type { CaseNoteRequest, Patient } from '@/types/requests';

// Status badge component
const getStatusBadge = (status: string, displayStatus?: string, isWaitingForApproval?: boolean, isIndividualRequest?: boolean, isCompletedAndHandedOver?: boolean, isRejectedReturn?: boolean) => {
  // Check for rejected return status first
  if (isRejectedReturn) {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
        <AlertTriangle className="h-3 w-3" />
        <span>REJECTED RETURN</span>
      </Badge>
    );
  }

  // If there's a custom display status (like "Waiting for Approval"), use it
  if (displayStatus && isWaitingForApproval) {
    if (isIndividualRequest) {
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
          <Clock className="h-3 w-3" />
          <span>WAITING FOR MR APPROVAL</span>
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
          <Clock className="h-3 w-3" />
          <span>WAITING FOR APPROVAL</span>
        </Badge>
      );
    }
  }

  // Special styling for completed and handed over case notes
  if (isCompletedAndHandedOver) {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="h-3 w-3" />
        <span>COMPLETED</span>
      </Badge>
    );
  }

  const statusColors = {
    'pending': { icon: Clock, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'approved': { icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-200' },
    'in_progress': { icon: Clock, className: 'bg-purple-100 text-purple-800 border-purple-200' },
    'completed': { icon: CheckCircle, className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    'rejected': { icon: AlertTriangle, className: 'bg-red-100 text-red-800 border-red-200' }
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

// Involvement type badge
const getInvolvementBadge = (requestedBy: number, currentPIC: number, userId: number, isIndividualRequest?: boolean, status?: string) => {
  // Debug logging
  console.log('Involvement Badge Debug:', {
    requestedBy,
    currentPIC,
    userId,
    isCreator: requestedBy === userId,
    isCurrentPIC: currentPIC === userId,
    currentPICIsNull: currentPIC === null || currentPIC === 0,
    isIndividualRequest,
    status
  });

  // Handle individual requests (waiting for MR approval)
  if (isIndividualRequest) {
    return (
      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
        <FileText className="h-3 w-3 mr-1" />
        Requested by Me
      </Badge>
    );
  }

  // Handle completed and handed over case notes
  if (status === 'completed' && requestedBy === userId && currentPIC !== userId) {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
        <ArrowUpRight className="h-3 w-3 mr-1" />
        Returned & Completed
      </Badge>
    );
  }

  // User created the case note
  if (requestedBy === userId) {
    if (currentPIC === userId) {
      // User created it and still owns it
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
          <FileText className="h-3 w-3 mr-1" />
        Requested & Verified
        </Badge>
      );
    } else if (currentPIC === null || currentPIC === 0) {
      // User created it but it's not assigned to anyone (e.g., completed case notes)
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          <FileText className="h-3 w-3 mr-1" />
          Created
        </Badge>
      );
    } else {
      // User created it but it's assigned to someone else (handed over)
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          <ArrowUpRight className="h-3 w-3 mr-1" />
          Handed Over
        </Badge>
      );
    }
  }
  // User didn't create the case note
  else {
    if (currentPIC === userId) {
      // User didn't create it but currently owns it (assigned via handover)
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
          <Users className="h-3 w-3 mr-1" />
          Handed Over to Me
        </Badge>
      );
    } else {
      // User was previously involved but no longer owns it
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
          <User className="h-3 w-3 mr-1" />
          Previously Involved
        </Badge>
      );
    }
  }
};

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CaseNoteRequest[]>([]);
  const [individualRequests, setIndividualRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [involvementFilter, setInvolvementFilter] = useState<string>('all');

  // Handover request modal state
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [selectedPatientForHandover, setSelectedPatientForHandover] = useState<Patient | null>(null);

  useEffect(() => {
    const loadRequests = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        // Get all requests where user is involved (both created and assigned)
        const response = await requestsApi.getRequests({
          page: 1,
          per_page: 1000, // Get all requests for this user
          sort_by: 'created_at',
          sort_order: 'desc',
          include_all_involvement: true // This will return all requests where user is involved
        });

        // Get individual requests that are waiting for MR staff approval
        const individualResponse = await requestsApi.getIndividualRequests();

        if (response.success) {
          setRequests(response.requests.data);
        } else {
          setError('Failed to load requests');
        }

        if (individualResponse && individualResponse.success) {
          // Handle paginated response - extract the data array
          const individualData = individualResponse.data?.data || individualResponse.data || [];
          setIndividualRequests(individualData);
        }
      } catch (error: any) {
        console.error('Error loading requests:', error);
        setError('Failed to load requests');
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, [user]);

  // Combine regular requests and individual requests
  const allRequests = [
    ...requests,
    ...individualRequests.map((indRequest: any) => ({
      ...indRequest,
      // Add individual request specific fields
      is_individual_request: true,
      display_status: 'Waiting for MR Approval',
      is_waiting_for_approval: true,
      // Map fields to match CaseNoteRequest structure
      patient: indRequest.patient,
      department: indRequest.department,
      doctor: indRequest.doctor,
      location: indRequest.location,
      requested_by_user_id: user?.id, // Individual requests are created by the current user
      current_pic_user_id: null, // Individual requests don't have a current PIC
    }))
  ];

  // Filter requests based on search and filters
  const filteredRequests = allRequests.filter((request: any) => {
    // Search filter
    const matchesSearch = !searchTerm ||
      request.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.patient?.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.request_number?.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'waiting_for_approval') {
        matchesStatus = request.is_waiting_for_approval === true;
      } else if (statusFilter === 'waiting_for_mr_approval') {
        matchesStatus = request.is_individual_request === true;
      } else {
        matchesStatus = request.status === statusFilter;
      }
    }

    // Involvement filter
    let matchesInvolvement = true;
    if (involvementFilter !== 'all') {
      const isCreator = request.requested_by_user_id === user?.id;
      const isCurrentPIC = request.current_pic_user_id === user?.id;
      const isIndividualRequest = request.is_individual_request === true;

      switch (involvementFilter) {
        case 'created':
          matchesInvolvement = isCreator || isIndividualRequest;
          break;
        case 'assigned':
          matchesInvolvement = isCurrentPIC && !isCreator && !isIndividualRequest;
          break;
        case 'handed_over':
          matchesInvolvement = isCreator && !isCurrentPIC && !isIndividualRequest;
          break;
        case 'current':
          matchesInvolvement = isCurrentPIC || isIndividualRequest;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesInvolvement;
  });





  const handleHandoverRequestSuccess = () => {
    setShowHandoverModal(false);
    setSelectedPatientForHandover(null);
    // Refresh the requests list
    window.location.reload();
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Case Notes</h1>
          <p className="text-gray-600 mt-2">
            Track all case notes you've been involved with - created, assigned, handed over, or batch requests waiting for MR approval
          </p>
        </div>
      </div>



      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by patient name, MRN, or request number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="waiting_for_approval">Waiting for Approval</SelectItem>
                  <SelectItem value="waiting_for_mr_approval">Waiting for MR Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Involvement</label>
              <Select value={involvementFilter} onValueChange={setInvolvementFilter}>
                <SelectTrigger className="focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                  <SelectValue placeholder="All involvement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Involvement</SelectItem>
                  <SelectItem value="created">Created by Me</SelectItem>
                  <SelectItem value="assigned">Assigned to Me</SelectItem>
                  <SelectItem value="handed_over">Handed Over by Me</SelectItem>
                  <SelectItem value="current">Currently Mine</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Case Note Requests</CardTitle>
          <CardDescription>
            Showing {filteredRequests.length} of {allRequests.length} requests
          </CardDescription>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">

              <span className="text-xs text-green-600 bg-green-100 px-1 py-0.5 rounded">✓</span>
              <span>Returned & Completed (no longer active)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No case note requests found</p>

            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-200">
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm">Date</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm">Patient Name</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm">MRN</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm">Involvement</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => {
                    // Determine if the case note is completed and handed over (no longer active)
                    const isCompletedAndHandedOver = request.status === 'completed' &&
                      request.requested_by_user_id === user?.id &&
                      request.current_pic_user_id !== user?.id;

                    // Apply green background for completed and handed over case notes
                    const rowClassName = isCompletedAndHandedOver
                      ? "border-b border-gray-200 hover:bg-green-50/50 bg-green-50/20 transition-colors"
                      : "border-b border-gray-200 hover:bg-gray-50/50 transition-colors";

                    return (
                      <tr key={request.id} className={rowClassName}>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold text-gray-900">{request.patient?.name || 'N/A'}</p>
                            {isCompletedAndHandedOver && (
                              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full font-medium" title="Completed and handed over - no longer active">
                                ✓
                              </span>
                            )}
                            {request.status === 'rejected' && request.rejection_reason && (
                              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full font-medium" title="Case note was rejected">
                                ✗
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 font-mono">#{request.request_number}</p>
                          {request.status === 'rejected' && request.rejection_reason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                              <div className="text-xs text-red-700">
                                <div className="font-medium mb-1">Rejection Reason:</div>
                                <div className="italic">"{request.rejection_reason}"</div>
                                {request.rejected_at && (
                                  <div className="text-xs mt-1 text-red-600">
                                    Rejected on {new Date(request.rejected_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-700 font-mono">{request.patient?.mrn || 'N/A'}</span>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(
                          request.status,
                          request.display_status,
                          request.is_waiting_for_approval,
                          request.is_individual_request,
                          request.is_completed_and_handed_over,
                          request.is_rejected_return
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {getInvolvementBadge(
                          request.requested_by_user_id,
                          request.current_pic_user_id || 0,
                          user?.id || 0,
                          request.is_individual_request,
                          request.status
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex space-x-2">
                          <Link to={`/requests/${request.id}`}>
                            <Button variant="outline" size="sm" className="text-xs">
                              <FileText className="h-3 w-3 mr-2" />
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Handover Request Modal */}
      <HandoverRequestModal
        patient={selectedPatientForHandover}
        isOpen={showHandoverModal}
        onClose={() => setShowHandoverModal(false)}
        onSuccess={handleHandoverRequestSuccess}
      />
    </div>
  );
}
