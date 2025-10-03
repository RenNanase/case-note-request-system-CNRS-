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
const getStatusBadge = (status: string, displayStatus?: string, isWaitingForApproval?: boolean, isIndividualRequest?: boolean, isCompletedAndHandedOver?: boolean) => {
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
        const individualResponse = await requestsApi.getIndividualRequests({
          per_page: 1000
        });

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
          <div className="flex items-center space-x-2 mb-2">

          </div>
          <h1 className="text-3xl font-bold text-gray-900">My Case Notes</h1>
          <p className="text-gray-600 mt-2">
            Track all case notes you've been involved with - created, assigned, handed over, or individual requests waiting for MR approval
          </p>
        </div>
      </div>



      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by patient name, MRN, or request number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Involvement</label>
              <Select value={involvementFilter} onValueChange={setInvolvementFilter}>
                <SelectTrigger>
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
              <Link to="/requests/new">
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Create New Request
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Patient Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">MRN</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Involvement</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
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
                      ? "border-b hover:bg-green-50 bg-green-25"
                      : "border-b hover:bg-gray-50";

                    return (
                      <tr key={request.id} className={rowClassName}>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{request.patient?.name || 'N/A'}</p>
                            {isCompletedAndHandedOver && (
                              <span className="text-xs text-green-600 bg-green-100 px-1 py-0.5 rounded" title="Completed and handed over - no longer active">
                                ✓
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">#{request.request_number}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{request.patient?.mrn || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(request.status, request.display_status, request.is_waiting_for_approval, request.is_individual_request, isCompletedAndHandedOver)}
                      </td>
                      <td className="py-3 px-4">
                        {getInvolvementBadge(
                          request.requested_by_user_id,
                          request.current_pic_user_id || 0,
                          user?.id || 0,
                          request.is_individual_request,
                          request.status
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Link to={`/requests/${request.id}`}>
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-2" />
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
