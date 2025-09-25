import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, CheckCircle, XCircle, Clock, Filter, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { requestsApi } from '@/api/requests';
import { useAuth } from '@/contexts/AuthContext';

import { BatchRequestForm } from '@/components/forms/BatchRequestForm';
import { VerifyIndividualReceiptModal } from '@/components/modals/VerifyIndividualReceiptModal';

interface BatchRequest {
  id: number;
  batch_number: string;
  status: string;
  requested_by_user_id: number;
  requested_by: {
    name: string;
    email: string;
  };
  batch_notes?: string;
  submitted_at: string;
  processed_at?: string;
  processed_by_user_id?: number;
  processed_by?: {
    name: string;
    email: string;
  };
  processing_notes?: string;
  requests_count: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
  created_at: string;
  // Verification fields
  is_verified?: boolean;
  received_count?: number;
  verified_at?: string;
  verified_by_user_id?: number;
  verified_by?: {
    name: string;
    email: string;
  };
  verification_notes?: string;
  // Individual case notes
  requests?: Array<{
    id: number;
    status: string;
    priority: string;
    is_received?: boolean;
    received_at?: string;
    received_by?: {
      name: string;
    };
    patient: {
      id: number;
      name: string;
      mrn: string;
      nationality_id?: string;
    };
    // Availability information
    is_available?: boolean;
    current_holder?: {
      id: number;
      name: string;
      email: string;
    };
    handover_status?: string;
  }>;
  // New field for indicating if there are more pending requests
  has_more_pending?: boolean;
}

export const BatchRequestsPage: React.FC = () => {
  const { toast } = useToast();
  const { hasRole } = useAuth();

  const [batchRequests, setBatchRequests] = useState<BatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedBatchForVerification, setSelectedBatchForVerification] = useState<BatchRequest | null>(null);
  const [minimizedCards, setMinimizedCards] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadBatchRequests();
  }, []);

  const loadBatchRequests = async () => {
    try {
      setLoading(true);
      const response = await requestsApi.getBatchRequests();

      if (response && response.success) {
        const requests = response.batch_requests || [];
        setBatchRequests(requests);

        // Minimize all cards by default
        const allBatchIds = new Set<number>(requests.map((batch: BatchRequest) => batch.id));
        setMinimizedCards(allBatchIds);
      } else {
        setError(response.message || 'Failed to load case note requests');
      }
    } catch (error: any) {
      console.error('Error loading case note requests:', error);
      setError(error instanceof Error ? error.message : 'Failed to load case note requests');
    } finally {
      setLoading(false);
    }
  };

  const toggleCardMinimize = (batchId: number) => {
    setMinimizedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
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
      partially_approved: {
        variant: 'outline' as const,
        icon: CheckCircle,
        text: 'Partially Approved',
        className: 'border-purple-300 text-purple-700 bg-purple-50'
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center space-x-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        <span>{config.text}</span>
      </Badge>
    );
  };

  const filteredBatchRequests = batchRequests.filter(batch => {
    const matchesSearch = batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.requested_by.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         // Search within case notes
                         (batch.requests && batch.requests.some(request =>
                           request.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           request.patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (request.patient.nationality_id && request.patient.nationality_id.toLowerCase().includes(searchTerm.toLowerCase()))
                         ));
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;

    // Only show batches that have pending requests (for CA users) or are not fully processed
    const hasPendingRequests = batch.pending_count > 0;
    const isNotFullyProcessed = batch.status === 'pending';

    // For CA users, only show batches with pending requests
    // For MR Staff/Admin, show all batches but filter out those with no pending requests
    const shouldShow = hasRole('CA') ? hasPendingRequests : (hasPendingRequests || isNotFullyProcessed);

    return matchesSearch && matchesStatus && shouldShow;
  });

  // Verification handlers
  const handleVerifyReceipt = (batch: BatchRequest) => {
    setSelectedBatchForVerification(batch);
    setShowVerifyModal(true);
  };

  const handleVerificationSuccess = () => {
    setShowVerifyModal(false);
    setSelectedBatchForVerification(null);
    loadBatchRequests(); // Reload to show updated verification status
  };

  // Helper function to check if batch can be verified
  const canVerifyBatch = (batch: BatchRequest): boolean => {
    const canVerify = batch.status === 'approved' && !batch.is_verified && (batch.approved_count || 0) > 0;
    console.log(`Debug - Can verify batch ${batch.batch_number}:`, {
      status: batch.status,
      is_verified: batch.is_verified,
      approved_count: batch.approved_count,
      canVerify: canVerify
    });
    return canVerify;
  };

  // const handleCreateSuccess = () => {
  //   setShowCreateForm(false);
  //   loadBatchRequests();
  //   toast({
  //     title: 'Success',
  //     description: 'Batch request created successfully',
  //     variant: 'default',
  //   });
  // };

  const getAvailabilityBadge = (caseNote: any) => {
    if (caseNote.handover_status === 'requested') {
      return (
        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
          <Clock className="h-3 w-3 mr-1" />
          Handover Requested
        </Badge>
      );
    } else if (caseNote.is_available) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Available
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Unavailable
        </Badge>
      );
    }
  };

  if (showCreateForm) {
    // Import and render the BatchRequestForm component
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Batch Request</h1>
        </div>
        <BatchRequestForm
          onSuccess={() => {
            setShowCreateForm(false);
            loadBatchRequests();
            toast({
              title: 'Success',
              description: 'Batch request created successfully',
              variant: 'default',
            });
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Case Note Requests</h1>
        {hasRole('CA') && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Case Note Request
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by batch number, requester, or case note details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="partially_approved">Partially Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Requests List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredBatchRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Clock className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Case Note requests found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : hasRole('CA')
                  ? 'Get started by creating your first case note request'
                  : 'All case note requests have been processed'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && hasRole('CA') && (
              <Button onClick={() => setShowCreateForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Case Note Request
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBatchRequests.map((batch) => (
            <Card key={batch.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header Section */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <Package className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">
                          {batch.batch_number}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span>By {batch.requested_by.name}</span>
                          <span>•</span>
                          <span>{new Date(batch.submitted_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{batch.requests_count + batch.approved_count + batch.rejected_count} total</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(batch.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCardMinimize(batch.id)}
                          className="ml-2 p-1 h-8 w-8"
                        >
                          {minimizedCards.has(batch.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    {!minimizedCards.has(batch.id) && (
                      <>
                        {/* Progress Section */}
                        <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Processing Progress</span>
                        <span className="text-sm text-gray-500">
                          {batch.approved_count + batch.rejected_count}/{batch.requests_count + batch.approved_count + batch.rejected_count} completed
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-green-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                          style={{
                            width: `${((batch.approved_count + batch.rejected_count) / (batch.requests_count + batch.approved_count + batch.rejected_count)) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Status Summary Cards */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">Approved</span>
                        </div>
                        <p className="text-2xl font-bold text-green-700 mt-1">{batch.approved_count}</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-700">Rejected</span>
                        </div>
                        <p className="text-2xl font-bold text-red-700 mt-1">{batch.rejected_count}</p>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-700">Pending</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-700 mt-1">{batch.pending_count}</p>
                      </div>
                    </div>

                    {/* Latest Pending Case Notes Preview */}
                    {batch.requests && batch.requests.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">Latest Pending Case Notes</h4>
                          {batch.has_more_pending && (
                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                              +{batch.pending_count - batch.requests.length} more
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {batch.requests.map((request) => (
                            <div key={request.id} className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {request.patient.name}
                                  </p>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {request.status}
                                    </Badge>
                                    {getAvailabilityBadge(request)}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3 text-xs text-gray-500">
                                  <span>MRN: {request.patient.mrn}</span>
                                  <span>•</span>
                                  <span>{request.priority} priority</span>
                                  {!request.is_available && request.current_holder && (
                                    <>
                                      <span>•</span>
                                      <span className="text-red-600">Held by {request.current_holder.name}</span>
                                    </>
                                  )}
                                  {request.handover_status === 'requested' && (
                                    <>
                                      <span>•</span>
                                      <span className="text-orange-600">Handover requested</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Verification Progress - only show for approved batches */}
                    {batch.status === 'approved' && (
                      <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center space-x-2 mb-3">
                          <Package className="h-5 w-5 text-purple-600" />
                          <span className="font-medium text-purple-700">Receipt Verification</span>
                        </div>
                        <div className="flex justify-between text-sm text-purple-700 mb-2">
                          <span>Progress</span>
                          <span>{batch.received_count || 0}/{batch.approved_count || 0} received</span>
                        </div>
                        <div className="w-full bg-purple-100 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${batch.approved_count ? ((batch.received_count || 0) / batch.approved_count) * 100 : 0}%`
                            }}
                          ></div>
                        </div>
                        {batch.is_verified && (
                          <div className="mt-2 text-xs text-purple-600 flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>All case notes verified as received</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Batch Notes */}
                    {batch.batch_notes && (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-sm font-medium text-gray-700">Batch Notes:</span>
                        <p className="text-gray-700 mt-1 text-sm">{batch.batch_notes}</p>
                      </div>
                    )}
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col items-end space-y-3 ml-6">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full"
                    >

                    </Button>

                    {/* Verify Received button - only for CAs on their own approved batches */}
                    {hasRole('CA') && canVerifyBatch(batch) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleVerifyReceipt(batch)}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Verify Receipt
                      </Button>
                    )}

                    {/* Verification status indicator */}
                    {batch.is_verified && (
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 w-full justify-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Individual Verification Modal */}
      <VerifyIndividualReceiptModal
        isOpen={showVerifyModal}
        onClose={() => {
          setShowVerifyModal(false);
          setSelectedBatchForVerification(null);
        }}
        onSuccess={handleVerificationSuccess}
        batchRequest={selectedBatchForVerification}
      />

      {/* Handover Request Modal */}
      {/* This dialog is no longer needed as handover is removed */}
    </div>
  );
};
