import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { requestsApi } from '@/api/requests';
import {
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Package,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface HandoverRequest {
  id: number;
  case_note_id: number;
  reason: string;
  priority: string;
  status: string;
  requested_at: string;
  responded_at?: string;
  response_notes?: string;
  case_note: {
    id: number;
    request_number: string;
    patient: {
      name: string;
      mrn: string;
    };
    department: {
      name: string;
    };
  };
  requester?: {
    id: number;
    name: string;
    email: string;
  };
  current_holder?: {
    id: number;
    name: string;
    email: string;
  };
  department: {
    name: string;
  };
  location?: {
    name: string;
  };
  doctor?: {
    name: string;
  };
}

const HandoverRequestsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState<HandoverRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<HandoverRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'my-requests' | 'incoming'>('my-requests');
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HandoverRequest | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check permissions
  useEffect(() => {
    if (!hasRole('CA')) {
      toast({
        title: 'Access Denied',
        description: 'Only Clinic Assistants can access this page.',
        variant: 'destructive',
      });
      return;
    }
  }, [hasRole, toast]);

  useEffect(() => {
    loadHandoverRequests();
  }, [activeTab]);

  // Load initial data when component mounts
  useEffect(() => {
    loadInitialData();
  }, []);

  // Refresh data when page becomes active (user navigates back)
  useEffect(() => {
    const handleFocus = () => {
      loadInitialData();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load both my requests and incoming requests in parallel
      const [myRequestsResponse, incomingRequestsResponse] = await Promise.all([
        requestsApi.getMyHandoverRequests(),
        requestsApi.getIncomingHandoverRequests()
      ]);

      if (myRequestsResponse.success) {
        const myRequestsData = myRequestsResponse as any;
        setMyRequests(myRequestsData.handover_requests || []);
      }

      if (incomingRequestsResponse.success) {
        const incomingRequestsData = incomingRequestsResponse as any;
        setIncomingRequests(incomingRequestsData.handover_requests || []);
      }
    } catch (error) {
      console.error('Error loading initial handover requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load handover requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadHandoverRequests = async () => {
    try {
      setLoading(true);

      if (activeTab === 'my-requests') {
        const response = await requestsApi.getMyHandoverRequests();
        if (response.success) {
          const responseData = response as any;
          setMyRequests(responseData.handover_requests || []);
        }
      } else {
        const response = await requestsApi.getIncomingHandoverRequests();
        if (response.success) {
          const responseData = response as any;
          setIncomingRequests(responseData.handover_requests || []);
        }
      }
    } catch (error) {
      console.error('Error loading handover requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load handover requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToRequest = (request: HandoverRequest) => {
    setSelectedRequest(request);
    setResponseNotes('');
    setShowResponseModal(true);
  };

  const handleSubmitResponse = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;

    try {
      setSubmitting(true);
      const response = await requestsApi.respondToHandoverRequest(selectedRequest.id, {
        action,
        notes: responseNotes
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: `Handover request ${action}d successfully`,
          variant: 'success',
        });

        // Add a small delay to ensure toast is displayed before closing modal
        setTimeout(() => {
          setShowResponseModal(false);
          setSelectedRequest(null);
          setResponseNotes('');
          loadHandoverRequests(); // Refresh the list
        }, 500);
      } else {
        toast({
          title: 'Error',
          description: response.message || `Failed to ${action} handover request`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error responding to handover request:', error);
      toast({
        title: 'Error',
        description: `Failed to ${action} handover request`,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      low: {
        variant: 'outline' as const,
        className: 'border-gray-300 text-gray-700 bg-gray-50'
      },
      normal: {
        variant: 'secondary' as const,
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      },
      high: {
        variant: 'outline' as const,
        className: 'border-orange-300 text-orange-700 bg-orange-50'
      },
      urgent: {
        variant: 'outline' as const,
        className: 'border-red-300 text-red-700 bg-red-50'
      },
    };

    const configItem = config[priority as keyof typeof config] || config.normal;

    return (
      <Badge variant={configItem.variant} className={configItem.className}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: {
        variant: 'outline' as const,
        icon: Clock,
        text: 'Pending',
        className: 'border-yellow-300 text-yellow-700 bg-yellow-50'
      },
      approved: {
        variant: 'outline' as const,
        icon: CheckCircle,
        text: 'Approved',
        className: 'border-green-300 text-green-700 bg-green-50'
      },
      rejected: {
        variant: 'outline' as const,
        icon: XCircle,
        text: 'Rejected',
        className: 'border-red-300 text-red-700 bg-red-50'
      },
    };

    const configItem = config[status as keyof typeof config] || config.pending;
    const Icon = configItem.icon;

    return (
      <Badge variant={configItem.variant} className={`flex items-center space-x-1 ${configItem.className}`}>
        <Icon className="h-3 w-3" />
        <span>{configItem.text}</span>
      </Badge>
    );
  };

  if (!hasRole('CA')) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4">
            <User className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only Clinic Assistants can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Handover Requests</h1>
          <p className="text-gray-600 mt-1">
            Manage case note handover requests
          </p>
        </div>
        <Button
          onClick={loadInitialData}
          disabled={loading}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('my-requests')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'my-requests'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Requests ({myRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('incoming')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'incoming'
              ? 'bg-white text-gray-900 shadow-sm'
              : incomingRequests.length > 0
              ? 'text-red-600 hover:text-red-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Incoming Requests ({incomingRequests.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'my-requests' ? (
            // My Requests Tab
            myRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Handover Requests</h3>
                  <p className="text-gray-500">You haven't made any handover requests yet.</p>
                </CardContent>
              </Card>
            ) : (
              myRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {request.case_note?.patient?.name || 'Unknown Patient'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              MRN: {request.case_note?.patient?.mrn || 'N/A'} • {request.case_note?.department?.name || 'Unknown Department'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getPriorityBadge(request.priority)}
                            {getStatusBadge(request.status)}
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Reason:</span> {request.reason}
                          </p>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Requested: {new Date(request.requested_at).toLocaleDateString()}
                          </span>
                          {request.responded_at && (
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              Responded: {new Date(request.responded_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {request.response_notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Response:</span> {request.response_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )
          ) : (
            // Incoming Requests Tab
            incomingRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Incoming Requests</h3>
                  <p className="text-gray-500">No pending handover requests for your case notes.</p>
                </CardContent>
              </Card>
            ) : (
              incomingRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow border-l-4 border-l-red-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="bg-red-100 p-2 rounded-lg">
                            <ArrowRight className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {request.case_note?.patient?.name || 'Unknown Patient'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              MRN: {request.case_note?.patient?.mrn || 'N/A'} • {request.case_note?.department?.name || 'Unknown Department'}
                            </p>
                            <p className="text-sm text-red-600">
                              Requested by: {request.requester?.name}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getPriorityBadge(request.priority)}
                            {getStatusBadge(request.status)}
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Reason:</span> {request.reason}
                          </p>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Requested: {new Date(request.requested_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRespondToRequest(request)}
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRespondToRequest(request)}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )
          )}
        </div>
      )}

      {/* Response Modal */}
      <Dialog open={showResponseModal} onOpenChange={setShowResponseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Respond to Handover Request</DialogTitle>
            <DialogDescription>
              {selectedRequest?.case_note?.patient?.name || 'Unknown Patient'} - {selectedRequest?.reason}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Response Notes (Optional)</label>
              <Textarea
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                placeholder="Add any notes about your decision..."
                rows={3}
                className="mt-1"
                disabled={submitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResponseModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmitResponse('reject')}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Processing...' : 'Reject'}
            </Button>
            <Button
              onClick={() => handleSubmitResponse('approve')}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? 'Processing...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HandoverRequestsPage;
