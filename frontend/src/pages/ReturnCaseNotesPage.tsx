import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  RotateCcw,
  Eye,
  RefreshCw,
  Trash2,
  Package,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { requestsApi } from '@/api/requests';
import type { CaseNoteRequest } from '@/types/requests';

// Status badge component
const getStatusBadge = (status: string, isPendingReturn?: boolean) => {
  // Special handling for pending return case notes
  if (isPendingReturn) {
    return (
      <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
        <Clock className="h-3 w-3" />
        <span>WAITING FOR MR STAFF RETURN VERIFICATION</span>
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

// Return status badge with improved visibility
const getReturnStatusBadge = (isReturned: boolean, isRejectedReturn: boolean, returnedAt?: string, rejectedAt?: string, isPendingReturn?: boolean) => {
  // Handle pending return case notes (waiting for MR staff verification)
  if (isPendingReturn) {
    return (
      <div className="space-y-1">
        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 font-semibold">
          <Clock className="h-3 w-3 mr-1" />
          Pending MR Verification
        </Badge>
        <p className="text-xs text-orange-600 font-medium">
          Waiting for approval
        </p>
      </div>
    );
  }

  if (isRejectedReturn) {
    return (
      <div className="space-y-1">
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 font-semibold">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Return Rejected
        </Badge>
        {rejectedAt && (
          <p className="text-xs text-red-600 font-medium">
            {new Date(rejectedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    );
  }

  if (isReturned) {
    return (
      <div className="space-y-1">
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Returned
        </Badge>
        {returnedAt && (
          <p className="text-xs text-gray-500">
            {new Date(returnedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    );
  }

  return (
    <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 font-semibold">
      <RotateCcw className="h-3 w-3 mr-1" />
      Available for Return
    </Badge>
  );
};

// Return Case Note Dialog Component
function ReturnCaseNoteDialog({
  request,
  isOpen,
  onClose,
  onReturn,
  isReReturn = false
}: {
  request: CaseNoteRequest;
  isOpen: boolean;
  onClose: () => void;
  onReturn: (requestId: number, returnNotes: string) => void;
  isReReturn?: boolean;
}) {
  const [returnNotes, setReturnNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Return notes are now optional - no validation needed
    setIsSubmitting(true);
    try {
      await onReturn(request.id, returnNotes.trim() || '');
      setReturnNotes('');
      onClose();
    } catch (error) {
      console.error('Error returning case note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReturnNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${isReReturn ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
              {isReReturn ? (
                <RefreshCw className="h-6 w-6" />
              ) : (
                <RotateCcw className="h-6 w-6" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                {isReReturn ? 'Re-return Case Note' : 'Return Case Note'}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                {request.patient?.name} • {request.request_number}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Case Note Details Card */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <h4 className="text-sm font-medium text-gray-500 mb-3">CASE NOTE DETAILS</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500">Patient Name</p>
                <p className="text-gray-900 font-medium">{request.patient?.name || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500">MRN</p>
                <p className="text-gray-900 font-mono">{request.patient?.mrn || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500">Request #</p>
                <p className="text-gray-900">{request.request_number || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500">Status</p>
                <div className="inline-block">
                  <Badge variant="outline" className="capitalize">
                    {request.status?.replace('_', ' ').toLowerCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Return Notes Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Return Notes <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <span className="text-xs text-gray-500">
                {returnNotes.length}/500
              </span>
            </div>
            <Textarea
              placeholder={
                isReReturn
                  ? "Explain why you're re-returning this case note..."
                  : "Provide details about the case note return..."
              }
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value.slice(0, 500))}
              className="min-h-[120px] text-sm border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required={false}
            />
            <p className="text-xs text-gray-500">
              {isReReturn
                ? "Please explain the reason for re-returning this case note."
                : "Please provide details about the case note return."
              }
            </p>
          </div>

          {/* Rejection Reason (if re-returning) */}
          {isReReturn && request.rejection_reason && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
              <div className="flex items-start">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800 mb-1">Previous Rejection</p>
                  <p className="text-sm text-red-700">{request.rejection_reason}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-full sm:w-24"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full ${isReReturn ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {isReReturn ? (
                  <RefreshCw className="h-4 w-4 mr-2" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                {isReReturn ? 'Re-return' : 'Return'} Case Note
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ReturnCaseNotesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CaseNoteRequest[]>([]);
  const [pendingReturnRequests, setPendingReturnRequests] = useState<CaseNoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [returnStatusFilter, setReturnStatusFilter] = useState<string>('all');
  const [commentFilter, setCommentFilter] = useState<string>('all');

  // Dialog state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CaseNoteRequest | null>(null);
  const [isReReturn, setIsReReturn] = useState(false);

  // Batch selection state
  const [selectedCaseNotes, setSelectedCaseNotes] = useState<Set<number>>(new Set());
  const [batchReturnDialogOpen, setBatchReturnDialogOpen] = useState(false);
  const [batchReturnNotes, setBatchReturnNotes] = useState('');
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Filters section state - default to collapsed
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => {
    const loadRequests = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        // Get all case notes the user has been involved with (for return purposes)
        console.log('🚀 Making API call to getReturnableCaseNotes...');
        const response = await requestsApi.getReturnableCaseNotes();
        console.log('📡 API Response received:', response);

        if (response.success && response.case_notes) {
          // The backend now handles all the filtering logic, so we can use the case_notes directly
          const returnableRequests = Array.isArray(response.case_notes) ? response.case_notes : [];

          console.log('📊 Backend filtered results:', {
            totalRequests: returnableRequests.length,
            requestsDetails: returnableRequests.map((req: CaseNoteRequest) => ({
              id: req.id,
              status: req.status,
              is_received: req.is_received,
              is_returned: req.is_returned,
              is_rejected_return: req.is_rejected_return,
              patient_name: req.patient?.name
            }))
          });

          // Log the results for debugging
          console.log('📊 Return Case Notes Results:', {
            totalRequests: Array.isArray(response.case_notes) ? response.case_notes.length : 0,
            returnableRequests: returnableRequests.length,
            currentUserId: user.id,
            returnableRequestsDetails: returnableRequests.map(req => ({
              id: req.id,
              status: req.status,
              is_received: req.is_received,
              patient_name: req.patient?.name
            }))
          });

          console.log('📝 Setting requests state with:', returnableRequests.length, 'case notes');
          setRequests(returnableRequests);

          // Extract pending return case notes from the main response
          // These are case notes that are waiting for MR staff verification
          const pendingReturnCaseNotes = returnableRequests.filter((req: CaseNoteRequest) => {
            // Check multiple conditions to identify pending return case notes
            const hasPendingReturnStatus = req.status === 'pending_return_verification';
            const wasReturnedByCurrentUser = req.returned_by_user_id === user?.id;
            const hasReturnedEvent = req.is_returned === true;
            const hasReturnNotes = !!req.return_notes;

            const isPendingReturn = hasPendingReturnStatus || (wasReturnedByCurrentUser && hasReturnedEvent && hasReturnNotes);

            console.log('🔍 Checking if case note is pending return:', {
              id: req.id,
              status: req.status,
              returned_by_user_id: req.returned_by_user_id,
              current_user_id: user?.id,
              is_returned: req.is_returned,
              return_notes: req.return_notes,
              hasPendingReturnStatus,
              wasReturnedByCurrentUser,
              hasReturnedEvent,
              hasReturnNotes,
              isPendingReturn
            });
            return isPendingReturn;
          });

          console.log('📊 Pending return case notes identified:', pendingReturnCaseNotes.length);
          console.log('📊 Pending return case notes details:', pendingReturnCaseNotes.map(req => ({
            id: req.id,
            status: req.status,
            patient_name: req.patient?.name,
            returned_by_user_id: req.returned_by_user_id
          })));
          setPendingReturnRequests(pendingReturnCaseNotes);
        } else if (response.success && !response.case_notes) {
          console.log('⚠️ API call successful but no case notes data');
          setError('No case notes data received');
          setRequests([]);
          setPendingReturnRequests([]);
        } else {
          console.log('❌ API call failed:', response);
          setError('Failed to load requests');
          setRequests([]);
          setPendingReturnRequests([]);
        }
      } catch (error: any) {
        console.error('💥 Error loading requests:', error);
        console.error('💥 Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        setError('Failed to load requests');
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, [user]);

  // Combine regular requests with pending return requests
  const allRequests = [
    ...(Array.isArray(requests) ? requests : []),
    ...(Array.isArray(pendingReturnRequests) ? pendingReturnRequests.map((pendingRequest: CaseNoteRequest) => ({
      ...pendingRequest,
      // Mark as pending return for special handling
      is_pending_return: true,
      // Map fields to match CaseNoteRequest structure
      patient: pendingRequest.patient,
      department: pendingRequest.department,
      doctor: pendingRequest.doctor,
      location: pendingRequest.location,
    })) : [])
  ];

  console.log('📊 Combined requests:', {
    regularRequests: Array.isArray(requests) ? requests.length : 0,
    pendingReturnRequests: Array.isArray(pendingReturnRequests) ? pendingReturnRequests.length : 0,
    totalCombined: allRequests.length,
    pendingReturnIds: Array.isArray(pendingReturnRequests) ? pendingReturnRequests.map(req => req.id) : []
  });

  // Filter requests based on search and filters
  const filteredRequests = allRequests.filter(request => {
    console.log('🔍 Filtering request:', {
      id: request.id,
      patient_name: request.patient?.name,
      status: request.status,
      searchTerm,
      statusFilter,
      returnStatusFilter,
      commentFilter
    });

    // Search filter
    const matchesSearch = searchTerm === '' ||
      request.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.patient?.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.request_number?.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'waiting_for_mr_return_verification') {
        matchesStatus = request.is_pending_return === true;
        console.log('🔍 Status filter - waiting_for_mr_return_verification:', {
          id: request.id,
          is_pending_return: request.is_pending_return,
          matchesStatus
        });
      } else {
        matchesStatus = request.status === statusFilter;
        console.log('🔍 Status filter - other status:', {
          id: request.id,
          status: request.status,
          filterStatus: statusFilter,
          matchesStatus
        });
      }
    }

    // Return status filter
    let matchesReturnStatus = true;
    if (returnStatusFilter !== 'all') {
      if (returnStatusFilter === 'available') {
        matchesReturnStatus = !request.is_returned && !request.is_rejected_return;
      } else if (returnStatusFilter === 'returned') {
        matchesReturnStatus = request.is_returned === true;
      } else if (returnStatusFilter === 'rejected') {
        matchesReturnStatus = request.is_rejected_return === true;
      } else if (returnStatusFilter === 'pending_verification') {
        matchesReturnStatus = request.is_pending_return === true;
      }

      console.log('🔍 Return status filter:', {
        id: request.id,
        returnStatusFilter,
        is_returned: request.is_returned,
        is_rejected_return: request.is_rejected_return,
        is_pending_return: request.is_pending_return,
        matchesReturnStatus
      });
    }

    // Comment filter
    let matchesCommentFilter = true;
    if (commentFilter !== 'all') {
      if (commentFilter === 'has_return_notes') {
        matchesCommentFilter = !!request.return_notes;
      } else if (commentFilter === 'has_rejection_reason') {
        matchesCommentFilter = !!request.rejection_reason;
      } else if (commentFilter === 'no_comments') {
        matchesCommentFilter = !request.return_notes && !request.rejection_reason;
      }

      console.log('🔍 Comment filter:', {
        id: request.id,
        commentFilter,
        return_notes: request.return_notes,
        rejection_reason: request.rejection_reason,
        matchesCommentFilter
      });
    }

    const result = matchesSearch && matchesStatus && matchesReturnStatus && matchesCommentFilter;
    console.log('✅ Filter result for request', request.id, ':', {
      matchesSearch,
      matchesStatus,
      matchesReturnStatus,
      matchesCommentFilter,
      finalResult: result
    });

    return result;
  });



  // Get returnable case notes from filtered results
  // Include case notes that are received and can be returned, plus pending return case notes
  const returnableCaseNotes = filteredRequests.filter(request => {
    const isPendingReturn = request.is_pending_return === true;
    const isRegularReturnable = request.is_received === true && (!request.is_returned || request.is_rejected_return);

    console.log('🔍 Checking if case note is returnable:', {
      id: request.id,
      is_pending_return: request.is_pending_return,
      is_received: request.is_received,
      is_returned: request.is_returned,
      is_rejected_return: request.is_rejected_return,
      isPendingReturn,
      isRegularReturnable,
      finalResult: isPendingReturn || isRegularReturnable
    });

    return isPendingReturn || isRegularReturnable;
  });

  // Handle case note selection for batch operations
  const handleCaseNoteSelection = (caseNoteId: number, isSelected: boolean) => {
    const newSelected = new Set(selectedCaseNotes);
    if (isSelected) {
      newSelected.add(caseNoteId);
    } else {
      newSelected.delete(caseNoteId);
    }
    setSelectedCaseNotes(newSelected);
  };

  // Handle select all/none
  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      const returnableIds = returnableCaseNotes.map(req => req.id);
      setSelectedCaseNotes(new Set(returnableIds));
    } else {
      setSelectedCaseNotes(new Set());
    }
  };

  // Handle batch return
  const handleBatchReturn = async () => {
    if (selectedCaseNotes.size === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one case note to return.',
        variant: 'destructive',
      });
      return;
    }

    // Batch return notes are now optional - no validation needed

    try {
      setBatchSubmitting(true);
      const response = await requestsApi.returnCaseNotes({
        case_note_ids: Array.from(selectedCaseNotes),
        return_notes: batchReturnNotes.trim() || undefined
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: `Successfully returned ${selectedCaseNotes.size} case note(s)`,
          variant: 'success',
        });

        // Clear selections and close dialog
        setSelectedCaseNotes(new Set());
        setBatchReturnNotes('');
        setBatchReturnDialogOpen(false);

        // Refresh the list
        window.location.reload();
      } else {
        toast({
          title: 'Return Failed',
          description: response.message || 'Failed to return case notes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error returning case notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to return case notes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Handle return case note (single)
  const handleReturnCaseNote = async (requestId: number, returnNotes: string) => {
    try {
      const response = await requestsApi.returnCaseNotes({
        case_note_ids: [requestId],
        return_notes: returnNotes
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Case note returned successfully',
          variant: 'success',
        });
        // Refresh the list
        window.location.reload();
      } else {
        toast({
          title: 'Return Failed',
          description: response.message || 'Failed to return case note',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error returning case note:', error);
      toast({
        title: 'Error',
        description: 'Failed to return case note. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Open return dialog
  const openReturnDialog = (request: CaseNoteRequest, reReturn: boolean = false) => {
    setSelectedRequest(request);
    setIsReReturn(reReturn);
    setReturnDialogOpen(true);
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
          
          <h1 className="text-3xl font-bold text-gray-900">Return Case Notes</h1>
          <p className="text-gray-600 mt-2">
            Manage case note returns - return completed case notes, view return status, and handle rejected returns
          </p>

          {/* Summary of case note counts */}
          <div className="flex items-center space-x-4 mt-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>Available: {requests.filter(r => r.is_received && !r.is_returned && !r.is_rejected_return).length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>Pending MR Verification: {pendingReturnRequests.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Returned: {requests.filter(r => r.is_returned).length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Rejected: {requests.filter(r => r.is_rejected_return).length}</span>
            </div>
          </div>
        </div>


      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setFiltersExpanded(!filtersExpanded)}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </div>
            {filtersExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </CardTitle>
        </CardHeader>
        {filtersExpanded && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="waiting_for_mr_return_verification">Waiting for MR Staff Return Verification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Return Status</label>
              <Select value={returnStatusFilter} onValueChange={setReturnStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All return statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Return Statuses</SelectItem>
                  <SelectItem value="available">Available for Return</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="rejected">Return Rejected</SelectItem>
                  <SelectItem value="pending_verification">Pending MR Verification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
              <Select
                value={commentFilter}
                onValueChange={setCommentFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All comments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Comments</SelectItem>
                  <SelectItem value="has_return_notes">Has Return Notes</SelectItem>
                  <SelectItem value="has_rejection_reason">Has Rejection Reason</SelectItem>
                  <SelectItem value="no_comments">No Comments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          </CardContent>
        )}
      </Card>

      {/* Batch Action Bar */}
      {returnableCaseNotes.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={returnableCaseNotes.length > 0 && selectedCaseNotes.size === returnableCaseNotes.length}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Select All ({returnableCaseNotes.length} returnable)
                  </label>
                </div>
                <div className="text-sm text-gray-600">
                  {selectedCaseNotes.size} of {returnableCaseNotes.length} selected
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {selectedCaseNotes.size > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCaseNotes(new Set())}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Selection
                    </Button>
                    <Button
                      onClick={() => setBatchReturnDialogOpen(true)}
                      disabled={selectedCaseNotes.size === 0}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Return Selected ({selectedCaseNotes.size})
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Case Note Returns & Rejected Returns</CardTitle>
          <CardDescription>
            Showing {filteredRequests.length} of {allRequests.length} case notes
            {returnableCaseNotes.length > 0 && (
              <span className="ml-2 text-purple-600 font-medium">
                • {returnableCaseNotes.length} available for return
              </span>
            )}
          </CardDescription>
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
              <p className="text-gray-500 mb-4">No case notes available for return</p>




            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-gray-700 w-12">Select</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Patient Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">MRN</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Return Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Comments</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => {
                    const isReturnable = request.is_received === true && (!request.is_returned || request.is_rejected_return);
                    return (
                      <tr key={request.id} className={`border-b hover:bg-gray-50 ${
                        request.is_rejected_return ? 'bg-red-50' :
                        request.is_returned ? 'bg-green-50' :
                        'bg-purple-50'
                      } ${
                        selectedCaseNotes.has(request.id) ? 'ring-2 ring-purple-500' : ''
                      }`}>
                        {/* Selection checkbox */}
                        <td className="py-3 px-2">
                          {isReturnable ? (
                            <Checkbox
                              id={`select-${request.id}`}
                              checked={selectedCaseNotes.has(request.id)}
                              onCheckedChange={(checked) =>
                                handleCaseNoteSelection(request.id, checked as boolean)
                              }
                            />
                          ) : (
                            <div className="w-4 h-4"></div> // Placeholder for alignment
                          )}
                        </td>
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
                          <p className="font-medium text-gray-900">{request.patient?.name || 'N/A'}</p>
                          <p className="text-sm text-gray-500">#{request.request_number}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{request.patient?.mrn || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(request.status, request.is_pending_return)}
                      </td>
                      <td className="py-3 px-4">
                        {getReturnStatusBadge(
                          request.is_returned || false,
                          request.is_rejected_return || false,
                          request.returned_at,
                          request.rejected_at,
                          request.is_pending_return
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="max-w-xs">
                          {/* Return Notes (from CA) */}
                          {request.return_notes && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-500 mb-1">Return Notes:</p>
                              <p className="text-sm text-gray-700 bg-purple-50 p-2 rounded border-l-2 border-purple-300">
                                {request.return_notes}
                              </p>
                              <div className="text-xs text-gray-500 mt-1 space-y-1">
                                {request.returned_by && (
                                  <p>Returned by: <span className="font-medium">{request.returned_by.name}</span></p>
                                )}
                                {request.returned_at && (
                                  <p>Returned on: <span className="font-medium">
                                    {new Date(request.returned_at).toLocaleString()}
                                  </span></p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Rejection Reason (from MR Staff) */}
                          {request.is_rejected_return && request.rejection_reason && (
                            <div>
                              <p className="text-xs font-medium text-red-500 mb-1">Rejection Reason:</p>
                              <p className="text-sm text-gray-700 bg-red-50 p-2 rounded border-l-2 border-red-300">
                                {request.rejection_reason}
                              </p>
                              <div className="text-xs text-gray-500 mt-1 space-y-1">
                                {request.rejected_by && (
                                  <p>Rejected by: <span className="font-medium">{request.rejected_by.name}</span></p>
                                )}
                                {request.rejected_at && (
                                  <p>Rejected on: <span className="font-medium">
                                    {new Date(request.rejected_at).toLocaleString()}
                                  </span></p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* No comments */}
                          {!request.return_notes && !request.rejection_reason && (
                            <span className="text-sm text-gray-400 italic">No comments</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Link to={`/requests/${request.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </Link>

                          {/* Return Case Note button - show for case notes that can be returned */}
                          {request.is_received === true &&
                           !request.is_returned &&
                           !request.is_rejected_return && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReturnDialog(request, false)}
                              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Return Case Note
                            </Button>
                          )}

                          {/* Re-return button - show for rejected returns */}
                          {request.is_rejected_return && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReturnDialog(request, true)}
                              className="bg-orange-200 border-orange-300 text-orange-800 hover:bg-orange-300"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Re-return
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Return Case Note Dialog */}
      {selectedRequest && (
        <ReturnCaseNoteDialog
          request={selectedRequest}
          isOpen={returnDialogOpen}
          onClose={() => {
            setReturnDialogOpen(false);
            setSelectedRequest(null);
            setIsReReturn(false);
          }}
          onReturn={handleReturnCaseNote}
          isReReturn={isReReturn}
        />
      )}

      {/* Batch Return Dialog */}
      <Dialog open={batchReturnDialogOpen} onOpenChange={setBatchReturnDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <span>Return Selected Case Notes</span>
            </DialogTitle>
            <DialogDescription>
              Return {selectedCaseNotes.size} selected case note(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selected Case Notes Summary */}
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              <div className="bg-gray-50 p-3 border-b">
                <h4 className="font-medium text-gray-800">Selected Case Notes ({selectedCaseNotes.size})</h4>
              </div>
              <div className="p-3 space-y-2">
                {Array.from(selectedCaseNotes).map(caseNoteId => {
                  const caseNote = requests.find(r => r.id === caseNoteId);
                  if (!caseNote) return null;

                  return (
                    <div key={caseNoteId} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{caseNote.patient?.name}</div>
                        <div className="text-xs text-gray-600">
                          MRN: {caseNote.patient?.mrn} • #{caseNote.request_number}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCaseNoteSelection(caseNoteId, false)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Batch Return Notes Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Return Notes <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <Textarea
                placeholder="Provide notes for the batch return..."
                value={batchReturnNotes}
                onChange={(e) => setBatchReturnNotes(e.target.value)}
                className="min-h-[100px]"
                required={false}
              />
              <p className="text-xs text-gray-500 mt-1">
                These notes will be applied to all selected case notes in this batch return.
              </p>
            </div>
          </div>

          <DialogFooter className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setBatchReturnDialogOpen(false);
                setBatchReturnNotes('');
              }}
              disabled={batchSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBatchReturn}
              disabled={batchSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {batchSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Returning...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Return {selectedCaseNotes.size} Case Note(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
