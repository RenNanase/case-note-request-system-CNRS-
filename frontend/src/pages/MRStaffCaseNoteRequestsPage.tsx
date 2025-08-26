import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { requestsApi } from '@/api/requests';
import type { CaseNoteRequest as RequestType } from '@/types/requests';
import {
  Search,
  FileText,
  User,
  Loader2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface CaseNoteRequest {
  id: number;
  request_number: string;
  patient: {
    id: number;
    name: string;
    mrn: string;
  };
  priority: string;
  status: string;
  purpose: string;
  created_at: string;
  needed_date: string;
  department: {
    name: string;
  };
  doctor?: {
    name: string;
  };
  batch_id?: number;
  batch_number?: string;
  requested_by?: {
    id: number;
    name: string;
    email: string;
  };
}

interface CARequestGroup {
  ca_id: number;
  ca_name: string;
  ca_email: string;
  requests: CaseNoteRequest[];
  total_requests: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  latest_request_date: string;
}

const MRStaffCaseNoteRequestsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [caGroups, setCAGroups] = useState<CARequestGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [selectedCA, setSelectedCA] = useState<CARequestGroup | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');

  // Check permissions
  useEffect(() => {
    if (!hasRole('MR_STAFF')) {
      toast({
        title: 'Access Denied',
        description: 'Only Medical Records Staff can access this page.',
        variant: 'destructive',
      });
      return;
    }
  }, [hasRole, toast]);

  // Load case note requests grouped by CA
  const loadCaseNoteRequests = async () => {
    try {
      setLoading(true);
      const response = await requestsApi.getRequests({
        page: 1,
        per_page: 1000, // Get all requests to group them
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      if (response.success) {
        const requests = response.requests.data;

        // Group requests by CA - only include pending requests
        const groupedByCA = new Map<number, CARequestGroup>();

        requests.forEach((request: RequestType) => {
          // Skip requests without required data or non-pending requests
          if (!request.patient || !request.requested_by || request.status !== 'pending') {
            return;
          }

          const caId = request.requested_by.id;
          const caName = request.requested_by.name;
          const caEmail = request.requested_by.email;

          if (!groupedByCA.has(caId)) {
            groupedByCA.set(caId, {
              ca_id: caId,
              ca_name: caName,
              ca_email: caEmail,
              requests: [],
              total_requests: 0,
              pending_count: 0,
              approved_count: 0,
              rejected_count: 0,
              latest_request_date: request.created_at
            });
          }

          const group = groupedByCA.get(caId)!;

          // Transform the request to match our interface
          const transformedRequest: CaseNoteRequest = {
            id: request.id,
            request_number: request.request_number,
            patient: {
              id: request.patient.id,
              name: request.patient.name,
              mrn: request.patient.mrn
            },
            priority: request.priority,
            status: request.status,
            purpose: request.purpose,
            created_at: request.created_at,
            needed_date: request.needed_date,
            department: {
              name: request.department?.name || 'Unknown Department'
            },
            doctor: request.doctor ? {
              name: request.doctor.name
            } : undefined,
            batch_id: (request as any).batch_id,
            batch_number: (request as any).batch_number,
            requested_by: request.requested_by
          };

          group.requests.push(transformedRequest);
          group.total_requests++;
          group.pending_count++; // All requests in this filtered view are pending

          // Update latest request date
          if (new Date(request.created_at) > new Date(group.latest_request_date)) {
            group.latest_request_date = request.created_at;
          }
        });

        // Convert to array and sort by latest request date
        const sortedGroups = Array.from(groupedByCA.values()).sort((a, b) =>
          new Date(b.latest_request_date).getTime() - new Date(a.latest_request_date).getTime()
        );

        setCAGroups(sortedGroups);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load case note requests',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading case note requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load case note requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRole('MR_STAFF')) {
      loadCaseNoteRequests();
    }
  }, [hasRole]);

  // Filter CA groups based on search query
  const filteredCAGroups = caGroups.filter(group =>
    group.ca_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.ca_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle CA selection to show detailed view
  const handleCASelection = (caGroup: CARequestGroup) => {
    setSelectedCA(caGroup);
    setSelectedRequests([]);
  };

  // Handle individual case note selection
  const handleCaseNoteSelection = (requestId: number, checked: boolean) => {
    if (checked) {
      setSelectedRequests(prev => [...prev, requestId]);
    } else {
      setSelectedRequests(prev => prev.filter(id => id !== requestId));
    }
  };

  // Handle approval/rejection
  const handleApprovalAction = async () => {
    if (selectedRequests.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one case note to process.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      // Process each selected request
      const actionPromises = selectedRequests.map(requestId => {
        if (approvalAction === 'approve') {
          return requestsApi.approveRequest(requestId, approvalNotes);
        } else {
          return requestsApi.rejectRequest(requestId, approvalNotes);
        }
      });

      const results = await Promise.all(actionPromises);
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        toast({
          title: `${approvalAction === 'approve' ? 'Approval' : 'Rejection'} Successful`,
          description: `Successfully processed ${successCount} case note(s)${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
          variant: 'default',
        });

        // Reset selection and close modal
        setSelectedRequests([]);
        setApprovalNotes('');
        setShowApprovalDialog(false);

        // Close the CA detail dialog if it's open
        const currentCAId = selectedCA?.ca_id;
        setSelectedCA(null);

        // Refresh data to reflect changes
        if (currentCAId) {
          // Refresh the specific CA group data for immediate update
          await refreshCAGroupData(currentCAId);
        } else {
          // Fallback to full reload if no specific CA is selected
          await loadCaseNoteRequests();
        }
      }

      if (failureCount > 0) {
        toast({
          title: `${approvalAction === 'approve' ? 'Approval' : 'Rejection'} Failed`,
          description: `${failureCount} case note(s) failed to process. Please try again.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error processing case notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to process case notes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Refresh data for a specific CA group
  const refreshCAGroupData = async (caId: number) => {
    try {
      const response = await requestsApi.getRequests({
        page: 1,
        per_page: 1000,
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      if (response.success) {
        const requests = response.requests.data;

        // Find the specific CA group and update it
        const updatedGroups = caGroups.map(group => {
          if (group.ca_id === caId) {
            // Filter requests for this CA
            const caRequests = requests.filter((request: RequestType) =>
              request.requested_by?.id === caId && request.patient
            );

            // Transform and count requests
            const transformedRequests = caRequests.map((request: RequestType) => ({
              id: request.id,
              request_number: request.request_number,
              patient: {
                id: request.patient!.id,
                name: request.patient!.name,
                mrn: request.patient!.mrn
              },
              priority: request.priority,
              status: request.status,
              purpose: request.purpose,
              created_at: request.created_at,
              needed_date: request.needed_date,
              department: {
                name: request.department?.name || 'Unknown Department'
              },
              doctor: request.doctor ? {
                name: request.doctor.name
              } : undefined,
              batch_id: (request as any).batch_id,
              batch_number: (request as any).batch_number,
              requested_by: request.requested_by
            }));

            // Recalculate counts
            const pendingCount = transformedRequests.filter(r => r.status === 'pending').length;
            const approvedCount = transformedRequests.filter(r => r.status === 'approved').length;
            const rejectedCount = transformedRequests.filter(r => r.status === 'rejected').length;
            const latestDate = transformedRequests.length > 0
              ? transformedRequests.reduce((latest, current) =>
                  new Date(current.created_at) > new Date(latest) ? current.created_at : latest
                , transformedRequests[0].created_at)
              : group.latest_request_date;

            return {
              ...group,
              requests: transformedRequests,
              total_requests: transformedRequests.length,
              pending_count: pendingCount,
              approved_count: approvedCount,
              rejected_count: rejectedCount,
              latest_request_date: latestDate
            };
          }
          return group;
        });

        setCAGroups(updatedGroups);
      }
    } catch (error) {
      console.error('Error refreshing CA group data:', error);
    }
  };

  // Get priority badge with proper styling
  const getPriorityBadge = (priority: string) => {
    const config = {
      low: { 
        variant: 'outline' as const, 
        className: 'border-gray-300 text-gray-700 bg-gray-50 text-xs' 
      },
      normal: { 
        variant: 'outline' as const, 
        className: 'border-blue-300 text-blue-700 bg-blue-50 text-xs' 
      },
      high: { 
        variant: 'outline' as const, 
        className: 'border-orange-300 text-orange-700 bg-orange-50 text-xs' 
      },
      urgent: { 
        variant: 'outline' as const, 
        className: 'border-red-300 text-red-700 bg-red-50 text-xs' 
      },
    };

    const configItem = config[priority.toLowerCase() as keyof typeof config] || config.normal;

    return (
      <Badge variant={configItem.variant} className={configItem.className}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending Case Note Requests</h1>
          <p className="text-gray-600 mt-1">
            Review and approve pending case note requests from Clinic Assistants
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">CAs with Pending Requests</div>
          <div className="text-2xl font-bold text-yellow-600">{caGroups.length}</div>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by CA name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* CA Groups List */}
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
      ) : filteredCAGroups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Case Note Requests Found</h3>
            <p className="text-gray-500">
              {searchQuery ? 'No CAs found matching your search.' : 'No case note requests have been submitted yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCAGroups.map((caGroup) => (
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
      <Dialog open={!!selectedCA} onOpenChange={() => setSelectedCA(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve Pending Case Notes - {selectedCA?.ca_name}</DialogTitle>
            <DialogDescription>
              Review and approve pending case note requests from this Clinic Assistant
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Simple Header Info */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm text-gray-500">Pending case notes:</span>
                <span className="ml-2 font-medium text-gray-900">{selectedCA?.pending_count}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Total requests:</span>
                <span className="ml-2 font-medium text-gray-900">{selectedCA?.total_requests}</span>
              </div>
            </div>

            {/* Case Notes List */}
            <div className="space-y-3">
              {selectedCA?.requests.filter(request => request.status === 'pending').length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
                  <h3 className="text-lg font-medium mb-2">No Pending Case Notes</h3>
                  <p className="text-gray-500">All case notes from this CA have been processed.</p>
                </div>
              ) : (
                selectedCA?.requests
                  .filter(request => request.status === 'pending')
                  .map((request) => (
                  <div
                    key={request.id}
                    className="p-4 border border-yellow-300 bg-yellow-50 rounded-lg"
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedRequests.includes(request.id)}
                        onCheckedChange={(checked) =>
                          handleCaseNoteSelection(request.id, checked as boolean)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{request.patient.name}</h4>
                          <div className="flex gap-2">
                            {getPriorityBadge(request.priority)}
                            {request.batch_number && (
                              <Badge variant="outline" className="text-xs">
                                Batch: {request.batch_number}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          <div>MRN: {request.patient.mrn}</div>
                          <div>Request: {request.request_number}</div>
                          <div>Department: {request.department.name}</div>
                          <div>Purpose: {request.purpose}</div>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              Created: {new Date(request.created_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Needed: {new Date(request.needed_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between">
              <div className="text-sm text-gray-500">
                {selectedRequests.length > 0 && (
                  <span>{selectedRequests.length} case note(s) selected</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedCA(null)}
                >
                  Close
                </Button>
                {selectedRequests.length > 0 && (
                  <>
                    <Button
                      variant="default"
                      onClick={() => {
                        setApprovalAction('approve');
                        setShowApprovalDialog(true);
                      }}
                      className="flex items-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Approve Selected</span>
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setApprovalAction('reject');
                        setShowApprovalDialog(true);
                      }}
                      className="flex items-center space-x-2"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Reject Selected</span>
                    </Button>
                  </>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approval/Rejection Dialog */}
        <Dialog open={showApprovalDialog} onOpenChange={(open) => {
          if (!submitting) {
            setShowApprovalDialog(open);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center space-x-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  approvalAction === 'approve'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {approvalAction === 'approve' ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <XCircle className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-xl">
                    {approvalAction === 'approve' ? 'Approve' : 'Reject'} Case Notes
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {approvalAction === 'approve'
                      ? 'Approve the selected case notes. They will move to the CA\'s verification workflow.'
                      : 'Reject the selected case notes. The CA will be notified of the rejection.'
                    }
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Summary Card */}
              <div className={`p-4 rounded-lg border ${
                approvalAction === 'approve'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Selected case notes:</span>
                    <p className={`text-2xl font-bold ${
                      approvalAction === 'approve' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {selectedRequests.length}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    approvalAction === 'approve'
                      ? 'bg-green-100'
                      : 'bg-red-100'
                  }`}>
                    {approvalAction === 'approve' ? (
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-3">
                <Label htmlFor="approval-notes" className="text-sm font-medium text-gray-700">
                  {approvalAction === 'approve' ? 'Approval' : 'Rejection'} Notes
                  <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                </Label>
                <Textarea
                  id="approval-notes"
                  placeholder={`Add ${approvalAction === 'approve' ? 'approval' : 'rejection'} notes...`}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={4}
                  disabled={submitting}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  These notes will be visible to the Clinic Assistant and included in the case note history.
                </p>
              </div>

              {/* Confirmation Message */}
              <div className={`p-3 rounded-lg ${
                approvalAction === 'approve'
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-orange-50 border border-orange-200'
              }`}>
                <div className="flex items-start space-x-2">
                  <div className={`p-1 rounded ${
                    approvalAction === 'approve'
                      ? 'bg-blue-100'
                      : 'bg-orange-100'
                  }`}>
                    {approvalAction === 'approve' ? (
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-orange-600" />
                    )}
                  </div>
                  <div className="text-sm">
                    <p className={`font-medium ${
                      approvalAction === 'approve' ? 'text-blue-800' : 'text-orange-800'
                    }`}>
                      {approvalAction === 'approve' ? 'Ready to Approve' : 'Ready to Reject'}
                    </p>
                    <p className={`text-xs ${
                      approvalAction === 'approve' ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      {selectedRequests.length} case note(s) will be {approvalAction === 'approve' ? 'approved' : 'rejected'}.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setShowApprovalDialog(false)}
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant={approvalAction === 'approve' ? 'default' : 'destructive'}
                onClick={handleApprovalAction}
                disabled={submitting}
                className={`w-full sm:w-auto flex items-center space-x-2 ${
                  approvalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : approvalAction === 'approve' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span>
                  {submitting ? 'Processing...' : `${approvalAction === 'approve' ? 'Approve' : 'Reject'} Case Notes`}
                </span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  export default MRStaffCaseNoteRequestsPage;
