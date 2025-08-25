import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, CheckCircle, XCircle, Clock, Filter, Package } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { requestsApi } from '@/api/requests';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
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
  }>;
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

  useEffect(() => {
    loadBatchRequests();
  }, []);

  const loadBatchRequests = async () => {
    try {
      setLoading(true);
      console.log('Starting to load batch requests...');
      const response = await requestsApi.getBatchRequests();
      console.log('Batch requests API response:', response); // Debug log
      console.log('Response type:', typeof response);
      console.log('Response keys:', response ? Object.keys(response) : 'Response is null/undefined');
      console.log('Response.success:', response?.success);
      console.log('Response.batch_requests:', response?.batch_requests);

      if (response?.batch_requests) {
        console.log('Debug - Batch requests details:');
        response.batch_requests.forEach((batch: any, index: number) => {
          console.log(`  Batch ${index}:`, {
            batch_number: batch.batch_number,
            status: batch.status,
            approved_count: batch.approved_count,
            is_verified: batch.is_verified,
            requests: batch.requests?.length || 0
          });
        });
      }

      if (response && response.success) {
        setBatchRequests(response.batch_requests || []);
        setError(null); // Clear any previous errors
      } else {
        console.error('API returned error:', response);
        toast({
          title: 'Error',
          description: response.message || 'Failed to load batch requests',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading batch requests:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      setError(error instanceof Error ? error.message : 'Failed to load batch requests');
      toast({
        title: 'Error',
        description: 'Failed to load batch requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock, text: 'Pending' },
      approved: { variant: 'default' as const, icon: CheckCircle, text: 'Approved' },
      rejected: { variant: 'destructive' as const, icon: XCircle, text: 'Rejected' },
      partially_approved: { variant: 'outline' as const, icon: CheckCircle, text: 'Partially Approved' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className="h-3 w-3" />
        <span>{config.text}</span>
      </Badge>
    );
  };

  const filteredBatchRequests = batchRequests.filter(batch => {
    const matchesSearch = batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.requested_by.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
    return matchesSearch && matchesStatus;
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
        <h1 className="text-3xl font-bold text-gray-900">Batch Requests</h1>
        {hasRole('CA') && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Batch Request
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
                  placeholder="Search by batch number or requester..."
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No batch requests found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first batch request'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && hasRole('CA') && (
              <Button onClick={() => setShowCreateForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Batch Request
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBatchRequests.map((batch) => (
            <Card key={batch.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {batch.batch_number}
                      </h3>
                      {getStatusBadge(batch.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-500">Requested by:</span>
                        <p className="font-medium text-gray-900">{batch.requested_by.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Submitted:</span>
                        <p className="font-medium text-gray-900">
                          {new Date(batch.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Case Notes:</span>
                        <p className="font-medium text-gray-900">{batch.requests_count}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{batch.approved_count + batch.rejected_count}/{batch.requests_count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${((batch.approved_count + batch.rejected_count) / batch.requests_count) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Status Summary */}
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-gray-600">Approved: {batch.approved_count}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-gray-600">Rejected: {batch.rejected_count}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span className="text-gray-600">Pending: {batch.pending_count}</span>
                      </div>
                    </div>

                    {/* Verification Progress - only show for approved batches */}
                    {batch.status === 'approved' && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex justify-between text-sm text-blue-700 mb-2">
                          <span className="font-medium">Receipt Verification</span>
                          <span>{batch.received_count || 0}/{batch.approved_count || 0} received</span>
                        </div>
                        <div className="w-full bg-blue-100 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${batch.approved_count ? ((batch.received_count || 0) / batch.approved_count) * 100 : 0}%`
                            }}
                          ></div>
                        </div>
                        {batch.is_verified && (
                          <div className="mt-2 text-xs text-blue-600">
                            ✓ All case notes verified as received
                          </div>
                        )}
                      </div>
                    )}

                    {batch.batch_notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-500">Batch Notes:</span>
                        <p className="text-gray-700 mt-1">{batch.batch_notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={`/batch-requests/${batch.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Link>
                    </Button>

                    {/* Verify Received button - only for CAs on their own approved batches */}
                    {hasRole('CA') && canVerifyBatch(batch) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleVerifyReceipt(batch)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Verify Individual Receipt
                      </Button>
                    )}

                    {/* Verification status indicator */}
                    {batch.is_verified && (
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
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
    </div>
  );
};
