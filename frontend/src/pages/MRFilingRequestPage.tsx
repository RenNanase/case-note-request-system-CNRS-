import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { requestsApi } from '@/api/requests';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  CheckCircle,
  Calendar,
  User,
  Search
} from 'lucide-react';


interface FilingRequest {
  id: number;
  filing_number: string;
  status: 'pending' | 'approved' | 'rejected';
  case_note_ids?: number[];
  patient_ids?: number[];
  patient_count?: number;
  is_patient_based?: boolean;
  submission_notes?: string;
  approval_notes?: string;
  created_at: string;
  approved_at?: string;
  submitted_by: {
    id: number;
    name: string;
    email: string;
  };
  approved_by?: {
    name: string;
  };
}

interface CAFilingGroup {
  ca_id: number;
  ca_name: string;
  ca_email: string;
  filing_requests: FilingRequest[];
  total_requests: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  latest_request_date: string;
}


const MRFilingRequestPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [caFilingGroups, setCAFilingGroups] = useState<CAFilingGroup[]>([]);
  const [selectedFilingRequests, setSelectedFilingRequests] = useState<number[]>([]);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [actionDialog, setActionDialog] = useState<'approve' | null>(null);
  const [selectedCA, setSelectedCA] = useState<CAFilingGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filingRequestDetails, setFilingRequestDetails] = useState<Map<number, any>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [filingHistory, setFilingHistory] = useState<any[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!hasRole('MR_STAFF')) {
      toast({
        title: 'Access Denied',
        description: 'Only MR Staff can access this page.',
        variant: 'destructive',
      });
      return;
    }
    loadData();
  }, [hasRole, toast]);


  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadFilingRequests(),
        loadFilingHistory()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFilingRequests = async () => {
    try {
      const response = await requestsApi.getMRFilingRequests();
      if (response.success) {
        const filingRequests = (response as any).filing_requests || [];

        // Group filing requests by CA
        const groupedByCA = new Map<number, CAFilingGroup>();

        filingRequests.forEach((request: any) => {
          const caId = request.submitted_by.id;
          const caName = request.submitted_by.name;
          const caEmail = request.submitted_by.email;

          if (!groupedByCA.has(caId)) {
            groupedByCA.set(caId, {
              ca_id: caId,
              ca_name: caName,
              ca_email: caEmail,
              filing_requests: [],
              total_requests: 0,
              pending_count: 0,
              approved_count: 0,
              rejected_count: 0,
              latest_request_date: request.created_at
            });
          }

          const group = groupedByCA.get(caId)!;
          group.filing_requests.push(request);
          group.total_requests++;

          if (request.status === 'pending') {
            group.pending_count++;
          } else if (request.status === 'approved') {
            group.approved_count++;
          } else if (request.status === 'rejected') {
            group.rejected_count++;
          }

          // Update latest request date
          if (new Date(request.created_at) > new Date(group.latest_request_date)) {
            group.latest_request_date = request.created_at;
          }
        });

        // Convert to array, filter out CAs with no pending requests, and sort by latest request date
        const sortedGroups = Array.from(groupedByCA.values())
          .filter(group => group.pending_count > 0) // Only show CAs with pending requests
          .sort((a, b) =>
            new Date(b.latest_request_date).getTime() - new Date(a.latest_request_date).getTime()
          );

        setCAFilingGroups(sortedGroups);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load filing requests',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading filing requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load filing requests',
        variant: 'destructive',
      });
    }
  };

  const loadFilingHistory = async () => {
    try {
      const response = await requestsApi.getMRFilingRequests();
      if (response.success) {
        const allRequests = (response as any).filing_requests || [];
        const sortedHistory = allRequests
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map((fr: any) => ({
            id: fr.id,
            filing_number: fr.filing_number,
            status: fr.status,
            submitted_by: fr.submitted_by,
            approved_by: fr.approved_by,
            created_at: fr.created_at,
            approved_at: fr.approved_at,
            submission_notes: fr.submission_notes,
            approval_notes: fr.approval_notes
          }));
        setFilingHistory(sortedHistory);
      }
    } catch (error) {
      console.error('Error loading filing history:', error);
    }
  };

  const handleFilingRequestSelection = (requestId: number, checked: boolean) => {
    if (checked) {
      setSelectedFilingRequests(prev => [...prev, requestId]);
      } else {
      setSelectedFilingRequests(prev => prev.filter(id => id !== requestId));
    }
  };

  const handleCASelection = async (caGroup: CAFilingGroup) => {
    setSelectedCA(caGroup);
    setSelectedFilingRequests([]);

    // Auto-load details for all pending filing requests
    const pendingRequests = caGroup.filing_requests.filter(request => request.status === 'pending');

    // Load details for all pending requests in parallel
    const detailPromises = pendingRequests.map(request => loadFilingRequestDetails(request.id));
    await Promise.all(detailPromises);
  };

  // Handle PDF download (mirror case note requests behavior)
  const handlePdfDownload = async () => {
    if (!selectedCA) return;

    try {
      setPdfLoading(true);

      const requestIds = selectedFilingRequests.length > 0
        ? selectedFilingRequests
        : selectedCA.filing_requests
            .filter(r => r.status === 'pending')
            .map(r => r.id);

      const pdfBlob = await requestsApi.generateFilingRequestListPdf(selectedCA.ca_id, requestIds);

      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;

      const safeName = selectedCA.ca_name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const date = new Date().toISOString().split('T')[0];
      const filename = `Filing_Requests_${safeName}_${date}.pdf`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'PDF Downloaded',
        description: `Filing requests for ${selectedCA.ca_name} have been downloaded successfully.`,
        variant: 'success',
      });
    } catch (error) {
      console.error('Error downloading filing request PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to download filing requests PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const loadFilingRequestDetails = async (filingRequestId: number) => {
    // If already loading, return existing data or null
    if (loadingDetails.has(filingRequestId)) {
      return filingRequestDetails.get(filingRequestId) || null;
    }

    // If already loaded, return the data
    if (filingRequestDetails.has(filingRequestId)) {
      return filingRequestDetails.get(filingRequestId);
    }

    try {
      setLoadingDetails(prev => new Set(prev).add(filingRequestId));
      const response = await requestsApi.getFilingRequestDetails(filingRequestId);

      if (response.success) {
        const details = (response as any).filing_request;
        setFilingRequestDetails(prev => new Map(prev).set(filingRequestId, details));
        return details;
      }
    } catch (error) {
      console.error('Error loading filing request details:', error);
    } finally {
      setLoadingDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(filingRequestId);
        return newSet;
      });
    }
    return null;
  };


  const getFilteredCAFilingGroups = () => {
    if (!searchQuery) return caFilingGroups;
    return caFilingGroups.filter(group =>
      group.ca_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.ca_email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleApproveFilingRequests = async () => {
    if (selectedFilingRequests.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one filing request to approve.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      const actionPromises = selectedFilingRequests.map(requestId => {
        return requestsApi.approveFilingRequest(requestId, approvalNotes);
      });

      const results = await Promise.all(actionPromises);
      const successCount = results.filter(result => result.success).length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        toast({
          title: 'Success',
          description: `Successfully approved ${successCount} filing request(s).`,
          variant: 'success',
        });
      }

      if (failureCount > 0) {
        toast({
          title: 'Partial Failure',
          description: `Failed to approve ${failureCount} filing request(s).`,
          variant: 'destructive',
        });
      }

      setSelectedFilingRequests([]);
      setApprovalNotes('');
      setActionDialog(null);
      setSelectedCA(null);
      // Clear the filing request details cache to ensure fresh data
      setFilingRequestDetails(new Map());
      await loadData();

    } catch (error) {
      console.error('Error approving filing requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve filing requests',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: {
        variant: 'outline' as const,
        className: 'border-yellow-300 text-yellow-700 bg-yellow-50',
        icon: Clock
      },
      approved: {
        variant: 'outline' as const,
        className: 'border-green-300 text-green-700 bg-green-50',
        icon: CheckCircle
      },
      rejected: {
        variant: 'outline' as const,
        className: 'border-red-300 text-red-700 bg-red-50',
        icon: XCircle
      },
    };

    const configItem = config[status as keyof typeof config] || config.pending;
    const Icon = configItem.icon;

    return (
      <Badge variant={configItem.variant} className={configItem.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };


  if (!hasRole('MR_STAFF')) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4">
            <User className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only Medical Records Staff can access this page.</p>
        </div>
      </div>
    );
  }

  const filteredCAFilingGroups = getFilteredCAFilingGroups();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Filing Request Management</h1>
          <p className="text-gray-600 mt-1">
            Review and approve pending filing requests from Clinic Assistants.
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">CAs with Pending Requests</div>
          <div className="text-2xl font-bold text-yellow-600">{filteredCAFilingGroups.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Requests ({filteredCAFilingGroups.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Filing History ({filingHistory.length})
            </div>
          </button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={activeTab === 'pending' ? "Search by CA name or email..." : "Search filing history..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content based on active tab */}
      {activeTab === 'pending' ? (
        /* Pending Requests Tab */
        <div>
          {/* CA Filing Groups List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-20" />
            </div>
              </CardContent>
            </Card>
          ))}
              </div>
      ) : filteredCAFilingGroups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Filing Requests Found</h3>
            <p className="text-gray-500">
              {searchQuery ? 'No CAs found matching your search.' : 'No filing requests have been submitted yet.'}
            </p>
          </CardContent>
        </Card>
          ) : (
            <div className="space-y-4">
          {filteredCAFilingGroups.map((caGroup) => (
            <Card key={caGroup.ca_id} className="hover:shadow-md transition-shadow border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => handleCASelection(caGroup)}>
                        {caGroup.ca_name}
                      </h3>
                      <p className="text-sm text-gray-500">{caGroup.ca_email}</p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>Latest: {new Date(caGroup.latest_request_date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{caGroup.total_requests} requests</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      {caGroup.pending_count} pending
                    </Badge>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleCASelection(caGroup)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Review
                    </Button>
                    </div>
                    </div>
              </CardContent>
            </Card>
          ))}
                      </div>
                    )}

      {/* CA Detail Dialog */}
      <Dialog open={!!selectedCA} onOpenChange={(open) => {
        if (!open) {
          setSelectedCA(null);
          setSelectedFilingRequests([]);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Filing Requests - {selectedCA?.ca_name}</DialogTitle>
            <DialogDescription>
              Review and approve pending filing requests from this Clinic Assistant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Simple Header Info */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-6">
                <div>
                  <span className="text-sm text-gray-500">Pending filing requests:</span>
                  <span className="ml-2 font-medium text-gray-900">{selectedCA?.pending_count}</span>
                </div>
              </div>
                      <div>
                <span className="text-sm text-gray-500">Total requests:</span>
                <span className="ml-2 font-medium text-gray-900">{selectedCA?.total_requests}</span>
                      </div>
                  </div>

            {/* Filing Requests List */}
            <div className="space-y-3">
              {selectedCA?.filing_requests.filter(request => request.status === 'pending').length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
                  <h3 className="text-lg font-medium mb-2">No Pending Filing Requests</h3>
                  <p className="text-gray-500">All filing requests from this CA have been processed.</p>
                </div>
              ) : (
                selectedCA?.filing_requests
                  .filter(request => request.status === 'pending')
                  .map((request) => {
                    const details = filingRequestDetails.get(request.id);
                    const isLoading = loadingDetails.has(request.id);

                    return (
                      <div
                        key={request.id}
                        className="p-4 border border-purple-300 bg-purple-50 rounded-lg"
                      >
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={selectedFilingRequests.includes(request.id)}
                            onCheckedChange={(checked) =>
                              handleFilingRequestSelection(request.id, checked as boolean)
                            }
                            className="mt-1"
                          />
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-purple-600" />
                                <h4 className="font-semibold text-gray-900">
                                  {isLoading ? 'Loading...' : (details?.patients?.[0]?.name || details?.case_notes?.[0]?.patient?.name || 'No patient data')}
                                </h4>
                              </div>
                              <div className="flex gap-2">
                                {getStatusBadge(request.status)}
                              </div>
                            </div>

                            {isLoading ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading patient details...
                              </div>
                            ) : details ? (
                              <div className="space-y-3">
                                {/* Patient Information - Minimalist Design */}
                                {details.patients && details.patients.length > 0 ? (
                                  <div className="space-y-3">
                                    {details.patients.map((patient: any, index: number) => (
                                      <div key={patient.id || index} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                                        <div className="p-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                                <User className="h-4 w-4 text-white" />
                                              </div>
                                              <div>
                                                <h5 className="font-semibold text-gray-900">{patient.name}</h5>
                                                <p className="text-sm text-gray-500">MRN: {patient.mrn}</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                              <span className="text-xs text-gray-500">Active</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : details.case_notes && details.case_notes.length > 0 ? (
                                  <div className="space-y-3">
                                    {details.case_notes.map((caseNote: any, index: number) => (
                                      <div key={caseNote.id || index} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                                        <div className="p-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                                <User className="h-4 w-4 text-white" />
                                              </div>
                                              <div>
                                                <h5 className="font-semibold text-gray-900">{caseNote.patient?.name}</h5>
                                                <p className="text-sm text-gray-500">MRN: {caseNote.patient?.mrn}</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                              <span className="text-xs text-gray-500">Active</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}

                                {/* Filing Request Description */}
                                {details.case_note_description && (
                                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="flex items-start gap-3">
                                      <FileText className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-sm font-medium text-purple-900 mb-1">Filing Request Description</p>
                                        <p className="text-sm text-gray-700">{details.case_note_description}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Created Date */}
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-600">Created:</span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {new Date(request.created_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </span>
                                  </div>
                                </div>
                          </div>
                            ) : (
                              <div className="text-center py-4">
                                <button
                                  onClick={() => loadFilingRequestDetails(request.id)}
                                  className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1 mx-auto"
                                >
                                  <FileText className="h-4 w-4" />
                                  Load Details
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
                    </div>

            {/* Action Buttons */}
            {selectedFilingRequests.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {selectedFilingRequests.length} filing request(s) selected
                  </span>
                </div>
                <Button
                  onClick={() => setActionDialog('approve')}
                  className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve Selected
                </Button>
            </div>
          )}

            {/* Download PDF */}
            <div className="flex justify-end">
              <Button onClick={handlePdfDownload} variant="outline" disabled={pdfLoading || !selectedCA} className="flex items-center gap-2">
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      ) : (
        /* Filing History Tab */
        <div className="space-y-4">
          {filingHistory.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Filing History</h3>
                <p className="text-gray-500">No filing requests have been processed yet.</p>
              </CardContent>
            </Card>
          ) : (
            filingHistory
              .filter(history =>
                !searchQuery ||
                history.filing_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                history.submitted_by.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (history.approved_by?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(history => (
                <Card key={history.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-purple-500" />
                          <h4 className="font-semibold text-gray-900">{history.filing_number}</h4>
                        </div>
                        {getStatusBadge(history.status)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(history.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          <span className="font-medium">Submitted by:</span> {history.submitted_by.name}
                        </span>
                      </div>
                      {history.approved_by && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            <span className="font-medium">Processed by:</span> {history.approved_by.name}
                          </span>
                        </div>
                      )}
                      {history.approved_at && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            <span className="font-medium">Processed on:</span> {new Date(history.approved_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {(history.submission_notes || history.approval_notes) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        {history.submission_notes && (
                          <div className="mb-2">
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-blue-800 mb-1">Submission Notes:</p>
                                <p className="text-sm text-blue-700">{history.submission_notes}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {history.approval_notes && (
                          <div>
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-purple-800 mb-1">
                                  {history.status === 'approved' ? 'Approval' : 'Rejection'} Notes:
                                </p>
                                <p className="text-sm text-purple-700">{history.approval_notes}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      )}

      {/* Approval Dialog */}
      <Dialog open={actionDialog !== null} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Selected Filing Requests</DialogTitle>
            <DialogDescription>
              Add approval notes for the selected filing requests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
              <Textarea
                id="approval-notes"
                placeholder="Enter any notes about this approval..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproveFilingRequests}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default MRFilingRequestPage;
