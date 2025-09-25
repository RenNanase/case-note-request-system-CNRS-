import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { requestsApi } from '@/api/requests';
import { handoverApi } from '@/api/handovers';
import type { HandoverCaseNote, GroupedHandovers } from '@/api/handovers';
import {
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  Loader2,
  Package,
  RefreshCw,
  ArrowRightLeft,
  XCircle,
  MessageSquare
} from 'lucide-react';
// import { format, isToday, isYesterday, parseISO } from 'date-fns';

interface ApprovedCaseNote {
  id: number;
  request_number: string;
  patient: {
    id: number;
    name: string;
    mrn: string;
    nationality_id?: string;
  };
  batch_id?: number;
  batch_number?: string;
  approved_at: string;
  approved_by?: {
    name: string;
  };
  is_received?: boolean;
  received_at?: string;
  received_by?: {
    name: string;
  };
  priority: string;
  purpose: string;
  department?: {
    name: string;
  };
  doctor?: {
    name: string;
  };
  approval_remarks?: string;
}

interface GroupedCaseNotes {
  [date: string]: ApprovedCaseNote[];
}

interface VerificationSubmission {
  case_note_ids: number[];
  verification_notes?: string;
}

interface RejectionSubmission {
  case_note_ids: number[];
  rejection_reason: string;
}

const VerifyCaseNotesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approvedCaseNotes, setApprovedCaseNotes] = useState<ApprovedCaseNote[]>([]);
  const [selectedCaseNotes, setSelectedCaseNotes] = useState<Set<number>>(new Set());
  const [verificationNotes, setVerificationNotes] = useState('');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [handoverLoading, setHandoverLoading] = useState(true);
    const [handoversNeedingVerification, setHandoversNeedingVerification] = useState<GroupedHandovers>({});
  const [selectedHandoversForVerification, setSelectedHandoversForVerification] = useState<Set<number>>(new Set());
  const [handoverVerificationNotes, setHandoverVerificationNotes] = useState('');
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Handover request verification state
  const [handoverRequestsPendingVerification, setHandoverRequestsPendingVerification] = useState<any[]>([]);
  const [selectedHandoverRequests, setSelectedHandoverRequests] = useState<Set<number>>(new Set());
  const [handoverRequestVerificationNotes, setHandoverRequestVerificationNotes] = useState('');
  const [handoverRequestSubmitting, setHandoverRequestSubmitting] = useState(false);


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

  // Load approved case notes waiting for verification
  const loadApprovedCaseNotes = async () => {
    try {
      setLoading(true);
      const response = await requestsApi.getApprovedCaseNotesForVerification();

      if (response.success) {
        setApprovedCaseNotes(response.case_notes || []);

        // Auto-expand today's date
        const today = new Date().toISOString().split('T')[0];
        setExpandedDates(new Set([today]));
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load approved case notes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading approved case notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load approved case notes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load handovers that need verification by the requesting CA
  const loadHandoversNeedingVerification = async () => {
    try {
      setHandoverLoading(true);
      const response = await handoverApi.getHandoversNeedingVerification();

      console.log('Handovers needing verification response:', response);

      if (response.success) {
        setHandoversNeedingVerification(response.handovers || {});
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to load handovers needing verification',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading handovers needing verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to load handovers needing verification',
        variant: 'destructive',
      });
    } finally {
      setHandoverLoading(false);
    }
  };

  // Load handovers that need acknowledgement by the receiving CA


  // Load handover requests pending verification by the requesting CA
  const loadHandoverRequestsPendingVerification = async () => {
    try {
      const response = await requestsApi.getHandoverRequestsPendingVerification();
      if (response && response.success) {
        setHandoverRequestsPendingVerification((response as any).handover_requests || []);
      }
    } catch (error) {
      console.error('Error loading handover requests pending verification:', error);
    }
  };

  // Handle handover verification selection
  const handleHandoverVerificationSelection = (handoverId: number, checked: boolean) => {
    const newSelected = new Set(selectedHandoversForVerification);
    if (checked) {
      newSelected.add(handoverId);
    } else {
      newSelected.delete(handoverId);
    }
    setSelectedHandoversForVerification(newSelected);
  };




  // Handle handover request verification selection
  const handleHandoverRequestSelection = (handoverRequestId: number, checked: boolean) => {
    const newSelected = new Set(selectedHandoverRequests);
    if (checked) {
      newSelected.add(handoverRequestId);
    } else {
      newSelected.delete(handoverRequestId);
    }
    setSelectedHandoverRequests(newSelected);
  };

  // Submit handover request verification
  const handleHandoverRequestVerification = async (action: 'approve' | 'reject') => {
    if (selectedHandoverRequests.size === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one handover request to verify.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setHandoverRequestSubmitting(true);

      const verificationPromises = Array.from(selectedHandoverRequests).map(handoverRequestId =>
        requestsApi.verifyHandoverRequest(handoverRequestId, {
          action: action,
          verification_notes: handoverRequestVerificationNotes.trim() || undefined
        })
      );

      const results = await Promise.all(verificationPromises);
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        toast({
          title: 'Success',
          description: `Successfully ${action}ed ${successCount} handover request(s)${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
          variant: 'default',
        });

        // Clear selections and reload data
        setSelectedHandoverRequests(new Set());
        setHandoverRequestVerificationNotes('');
        await loadHandoverRequestsPendingVerification();
      }

      if (failureCount > 0) {
        toast({
          title: 'Verification Failed',
          description: `${failureCount} handover request(s) failed to ${action}. Please try again.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error verifying handover requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify handover requests',
        variant: 'destructive',
      });
    } finally {
      setHandoverRequestSubmitting(false);
    }
  };

  // Submit handover receipt verification
  const handleHandoverReceiptVerification = async () => {
    if (selectedHandoversForVerification.size === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one handover to verify receipt.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setHandoverSubmitting(true);

      const verificationPromises = Array.from(selectedHandoversForVerification).map(handoverId =>
        handoverApi.verifyHandoverReceipt(handoverId, {
          receipt_verification_notes: handoverVerificationNotes.trim() || undefined
        })
      );

      const results = await Promise.all(verificationPromises);
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        toast({
          title: 'Success',
          description: `Successfully verified receipt of ${successCount} handover(s)${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
          variant: 'default',
        });

        // Clear selections and reload data
        setSelectedHandoversForVerification(new Set());
        setHandoverVerificationNotes('');
        await loadHandoversNeedingVerification();
      }

      if (failureCount > 0) {
        toast({
          title: 'Verification Failed',
          description: `${failureCount} handover(s) failed to verify. Please try again.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error verifying handover receipt:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify handover receipt',
        variant: 'destructive',
      });
    } finally {
      setHandoverSubmitting(false);
    }
  };



  useEffect(() => {
    if (hasRole('CA')) {
      loadApprovedCaseNotes();
      loadHandoversNeedingVerification();
      loadHandoverRequestsPendingVerification();
    }
  }, [hasRole]);

  // Group case notes by approval date
  const groupedCaseNotes: GroupedCaseNotes = approvedCaseNotes.reduce((groups, caseNote) => {
    const approvalDate = new Date(caseNote.approved_at).toISOString().split('T')[0];
    if (!groups[approvalDate]) {
      groups[approvalDate] = [];
    }
    groups[approvalDate].push(caseNote);
    return groups;
  }, {} as GroupedCaseNotes);

  // Sort dates (most recent first)
  const sortedDates = Object.keys(groupedCaseNotes).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Handle checkbox change
  const handleCheckboxChange = (caseNoteId: number, checked: boolean) => {
    const newSelected = new Set(selectedCaseNotes);
    if (checked) {
      newSelected.add(caseNoteId);
    } else {
      newSelected.delete(caseNoteId);
    }
    setSelectedCaseNotes(newSelected);
  };

  // Handle date expansion toggle
  const toggleDateExpansion = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  // Submit verification
  const handleSubmitVerification = async () => {
    if (selectedCaseNotes.size === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one case note to verify.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      const submissionData: VerificationSubmission = {
        case_note_ids: Array.from(selectedCaseNotes),
        verification_notes: verificationNotes.trim() || undefined,
      };

      const response = await requestsApi.verifyCaseNotesReceived(submissionData);

      if (response.success) {
        toast({
          title: 'Success',
          description: `Successfully verified ${selectedCaseNotes.size} case note(s) as received.`,
          variant: 'default',
        });

        // Clear selections and reload data
        setSelectedCaseNotes(new Set());
        setVerificationNotes('');
        await loadApprovedCaseNotes();
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to verify case notes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error verifying case notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify case notes',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit rejection (Not Verify)
  const handleSubmitRejection = async () => {
    if (selectedCaseNotes.size === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one case note to reject.',
        variant: 'destructive',
      });
      return;
    }

    if (!rejectionReason.trim()) {
      toast({
        title: 'Rejection Reason Required',
        description: 'Please provide a reason for rejecting these case notes.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setRejecting(true);

      const rejectionData: RejectionSubmission = {
        case_note_ids: Array.from(selectedCaseNotes),
        rejection_reason: rejectionReason.trim(),
      };

      const response = await requestsApi.rejectCaseNotesNotReceived(rejectionData);

      if (response.success) {
        toast({
          title: 'Success',
          description: `Successfully rejected ${selectedCaseNotes.size} case note(s) - returned to MR staff for re-request.`,
          variant: 'default',
        });

        // Clear selections and reload data
        setSelectedCaseNotes(new Set());
        setVerificationNotes('');
        setRejectionReason('');
        await loadApprovedCaseNotes();
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to reject case notes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error rejecting case notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject case notes',
        variant: 'destructive',
      });
    } finally {
      setRejecting(false);
    }
  };

  // Format date for display
  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
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
        className: 'border-purple-300 text-purple-700 bg-purple-50 text-xs'
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

  if (!hasRole('CA')) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Verify Case Notes</h1>
          <p className="text-gray-600 mt-2">
            Manage case note verifications and handover requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadApprovedCaseNotes}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs for different verification types */}
      <Tabs defaultValue="case-notes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="case-notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Verify Case Notes
          </TabsTrigger>
          <TabsTrigger value="handover-request-verification" className="flex items-center gap-2 relative">
            <MessageSquare className="h-4 w-4" />
            Verify Handover Requests
            {handoverRequestsPendingVerification.length > 0 && (
              <>
                {/* Red badge with count */}
                <Badge 
                  variant="destructive" 
                  className="ml-2 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center"
                >
                  {handoverRequestsPendingVerification.length}
                </Badge>
                {/* Pulsing red dot */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Verify Case Notes */}
        <TabsContent value="case-notes" className="space-y-6">
          {/* Summary Stats */}


          {/* Verification Form */}
          {selectedCaseNotes.size > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">
                  <Package className="h-5 w-5 inline mr-2" />
                  Case Note Verification ({selectedCaseNotes.size} selected)
                </CardTitle>
                <CardDescription>
                  Choose whether to verify receipt or reject as not received
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Verification Notes */}
                <div>
                  <Label htmlFor="verification-notes">Verification Notes (Optional)</Label>
                  <Textarea
                    id="verification-notes"
                    placeholder="Add any notes about the verification (e.g., condition of files, any discrepancies...)"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {/* Rejection Reason - Required for rejection */}
                <div>
                  <Label htmlFor="rejection-reason" className="text-red-600">
                    Rejection Reason (Required if rejecting) *
                  </Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Explain why these case notes cannot be verified (e.g., missing files, incorrect documents, etc.)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-1 border-red-200 focus:border-red-500"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  {/* Verify Button */}
                  <Button
                    onClick={handleSubmitVerification}
                    disabled={submitting || rejecting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Verify Receipt
                  </Button>

                  {/* Reject Button */}
                  <Button
                    onClick={handleSubmitRejection}
                    disabled={submitting || rejecting || !rejectionReason.trim()}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {rejecting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Reject (Not Received)
                  </Button>

                  {/* Clear Selection Button */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCaseNotes(new Set());
                      setVerificationNotes('');
                      setRejectionReason('');
                    }}
                    disabled={submitting || rejecting}
                  >
                    Clear Selection
                  </Button>
                </div>

                {/* Warning for rejection */}
                {rejectionReason.trim() && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center gap-2 text-red-700">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Warning:</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                      Rejecting these case notes will return them to MR staff for re-request.
                      This action cannot be undone.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Case Notes by Date */}
          {loading ? (
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin mr-3" />
                  <span>Loading approved case notes...</span>
                </div>
              </CardContent>
            </Card>
          ) : sortedDates.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No Approved Case Notes</h3>
                  <p>There are no approved case notes waiting for verification at this time.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedDates.map(date => {
                const caseNotes = groupedCaseNotes[date];
                const pendingCount = caseNotes.filter(cn => !cn.is_received).length;
                const receivedCount = caseNotes.filter(cn => cn.is_received).length;
                const isExpanded = expandedDates.has(date);

                return (
                  <Card key={date} className="shadow-sm border-0 bg-white hover:shadow-md transition-shadow">
                    <CardHeader
                      className="cursor-pointer hover:bg-gray-50/50 transition-colors rounded-t-lg"
                      onClick={() => toggleDateExpansion(date)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Calendar className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold text-gray-900">
                              {formatDateDisplay(date)}
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-600">
                              {caseNotes.length} case note{caseNotes.length !== 1 ? 's' : ''} • {receivedCount} received • {pendingCount} pending
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {pendingCount > 0 && (
                            <Badge variant="outline" className="text-orange-700 border-orange-200 bg-orange-50 px-3 py-1">
                              {pendingCount} pending
                            </Badge>
                          )}
                          {receivedCount > 0 && (
                            <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 px-3 py-1">
                              {receivedCount} received
                            </Badge>
                          )}
                          <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent>
                        <div className="space-y-3">
                          {caseNotes.map(caseNote => (
                            <div
                              key={caseNote.id}
                              className={`flex items-center space-x-4 p-4 rounded-xl border transition-all ${
                                caseNote.is_received
                                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm'
                                  : selectedCaseNotes.has(caseNote.id)
                                  ? 'bg-purple-50 border-purple-200 shadow-sm'
                                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                              }`}
                            >
                              <Checkbox
                                id={`case-note-${caseNote.id}`}
                                checked={selectedCaseNotes.has(caseNote.id)}
                                onCheckedChange={(checked) =>
                                  handleCheckboxChange(caseNote.id, checked as boolean)
                                }
                                disabled={caseNote.is_received}
                              />

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <Label
                                    htmlFor={`case-note-${caseNote.id}`}
                                    className="font-semibold cursor-pointer text-gray-900"
                                  >
                                    {caseNote.patient.name}
                                  </Label>
                                  <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                                    MRN: {caseNote.patient.mrn}
                                  </Badge>
                                  {getPriorityBadge(caseNote.priority)}
                                  {caseNote.batch_number && (
                                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                                      Batch: {caseNote.batch_number}
                                    </Badge>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                                  <div><span className="font-medium text-gray-700">Request:</span> {caseNote.request_number}</div>
                                  <div><span className="font-medium text-gray-700">Purpose:</span> {caseNote.purpose}</div>
                                  {caseNote.department && (
                                    <div><span className="font-medium text-gray-700">Department:</span> {caseNote.department.name}</div>
                                  )}
                                  {caseNote.doctor && (
                                    <div><span className="font-medium text-gray-700">Doctor:</span> {caseNote.doctor.name}</div>
                                  )}
                                </div>

                                {caseNote.is_received && (
                                  <div className="text-xs text-green-600 mt-1">
                                    ✓ Received by {caseNote.received_by?.name || 'N/A'} on{' '}
                                    {caseNote.received_at ? new Date(caseNote.received_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    }) : 'Unknown date'}
                                  </div>
                                )}
                              </div>

                              <div className="text-xs text-gray-500">
                                <div>Approved by {caseNote.approved_by?.name || 'N/A'}</div>
                                <div>{new Date(caseNote.approved_at).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}</div>
                              </div>

                              {/* Display MR Staff approval remarks if available */}
                              {caseNote.approval_remarks && (
                                <div className="col-span-full mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
                                  <div className="flex items-start gap-2">
                                    <MessageSquare className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <div className="text-xs font-medium text-purple-800 mb-1">
                                        MR Staff Approval Notes:
                                      </div>
                                      <div className="text-xs text-purple-700">
                                        {caseNote.approval_remarks}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>




        {/* Tab 3: Verify Requested Case Notes (Receipt Verification) */}
        <TabsContent value="handover-verification" className="space-y-6">
          <div className="flex items-center justify-between">

            <Button
              variant="outline"
              onClick={loadHandoversNeedingVerification}
              disabled={handoverLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${handoverLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Receipt Verification Form */}
          {selectedHandoversForVerification.size > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">
                  <ArrowRightLeft className="h-5 w-5 inline mr-2" />
                  Verify Receipt ({selectedHandoversForVerification.size} selected)
                </CardTitle>
                <CardDescription>
                  Confirm that you have received these case notes from the handover
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="receipt-verification-notes">Receipt Verification Notes (Optional)</Label>
                  <Textarea
                    id="receipt-verification-notes"
                    placeholder="Add any notes about the receipt verification..."
                    value={handoverVerificationNotes}
                    onChange={(e) => setHandoverVerificationNotes(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleHandoverReceiptVerification}
                    disabled={handoverSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {handoverSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                    )}
                    Verify Receipt
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedHandoversForVerification(new Set());
                      setHandoverVerificationNotes('');
                    }}
                    disabled={handoverSubmitting}
                  >
                    Clear Selection
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Handovers Needing Receipt Verification */}
          {handoverLoading ? (
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin mr-3" />
                  <span>Loading handovers needing receipt verification...</span>
                </div>
              </CardContent>
            </Card>
          ) : Object.keys(handoversNeedingVerification).length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-gray-500">
                  <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No Handovers Needing Receipt Verification</h3>
                  <p>You don't have any handovers waiting for receipt verification.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(handoversNeedingVerification).map(([date, handovers]) => (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      <Calendar className="h-5 w-5 inline mr-2" />
                      {formatDateDisplay(date)}
                    </CardTitle>
                    <CardDescription>
                      {handovers.length} handover(s) acknowledged on this date
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                                         <div className="space-y-3">
                       {handovers
                         .filter((handover: HandoverCaseNote) => handover.caseNoteRequest && handover.handedOverTo)
                         .map((handover: HandoverCaseNote) => (
                         <div
                           key={handover.id}
                           className={`flex items-center space-x-3 p-3 rounded-lg border ${
                             selectedHandoversForVerification.has(handover.id)
                               ? 'border-green-500 bg-green-50'
                               : 'border-gray-200 hover:bg-gray-50'
                           }`}
                         >
                          <Checkbox
                            id={`handover-ver-${handover.id}`}
                            checked={selectedHandoversForVerification.has(handover.id)}
                            onCheckedChange={(checked) =>
                              handleHandoverVerificationSelection(handover.id, checked as boolean)
                            }
                          />

                                                     <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                               <Label
                                 htmlFor={`handover-ver-${handover.id}`}
                                 className="font-medium cursor-pointer"
                               >
                                 {handover.caseNoteRequest?.patient?.name || 'Unknown Patient'}
                               </Label>
                               <Badge variant="outline" className="text-xs">
                                 MRN: {handover.caseNoteRequest?.patient?.mrn || 'N/A'}
                               </Badge>
                               {getPriorityBadge(handover.caseNoteRequest?.priority || 'normal')}
                             </div>

                             <div className="text-sm text-gray-600">
                               <div>Request: {handover.caseNoteRequest?.request_number || 'N/A'}</div>
                               <div>Purpose: {handover.caseNoteRequest?.purpose || 'N/A'}</div>
                               <div>Department: {handover.caseNoteRequest?.department?.name || 'Unknown Department'}</div>
                               <div>To: {handover.handedOverTo?.name || 'Unknown User'}</div>
                               {handover.handoverDoctor && (
                                 <div>Doctor: {handover.handoverDoctor.name}</div>
                               )}
                             </div>

                            {handover.handover_reason && (
                              <div className="text-xs text-gray-500 mt-1 p-2 bg-gray-100 rounded">
                                <strong>Reason:</strong> {handover.handover_reason}
                              </div>
                            )}

                            {handover.acknowledged_at && (
                              <div className="text-xs text-purple-600 mt-1">
                                ✓ Acknowledged by {handover.handedOverTo.name} on{' '}
                                {new Date(handover.acknowledged_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-gray-500">
                            <div>Requested at</div>
                            <div>{new Date(handover.created_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Verify Handover Requests */}
        <TabsContent value="handover-request-verification" className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-purple-500 text-white mr-3">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Verification</p>
                    <p className="text-2xl font-bold">{handoverRequestsPendingVerification.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-purple-500 text-white mr-3">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Selected</p>
                    <p className="text-2xl font-bold">{selectedHandoverRequests.size}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Handover Request Verification Form */}
          {selectedHandoverRequests.size > 0 && (
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-purple-800">
                  <MessageSquare className="h-5 w-5 inline mr-2" />
                  Handover Request Verification ({selectedHandoverRequests.size} selected)
                </CardTitle>
                <CardDescription>
                  Verify or reject the approved handover requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Verification Notes */}
                <div>
                  <Label htmlFor="handover-request-verification-notes">Verification Notes (Optional)</Label>
                  <Textarea
                    id="handover-request-verification-notes"
                    placeholder="Add any notes about the verification..."
                    value={handoverRequestVerificationNotes}
                    onChange={(e) => setHandoverRequestVerificationNotes(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleHandoverRequestVerification('approve')}
                    disabled={handoverRequestSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {handoverRequestSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Approve Selected ({selectedHandoverRequests.size})
                  </Button>

                  <Button
                    onClick={() => handleHandoverRequestVerification('reject')}
                    disabled={handoverRequestSubmitting}
                    variant="destructive"
                  >
                    {handoverRequestSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Reject Selected ({selectedHandoverRequests.size})
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Handover Requests List */}
          {handoverRequestsPendingVerification.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Handover Requests Pending Verification</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadHandoverRequestsPendingVerification}
                  disabled={handoverRequestSubmitting}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {handoverRequestsPendingVerification.map((handoverRequest: any) => (
                <Card key={handoverRequest.id} className="border-purple-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Checkbox
                        id={`handover-request-${handoverRequest.id}`}
                        checked={selectedHandoverRequests.has(handoverRequest.id)}
                        onCheckedChange={(checked) =>
                          handleHandoverRequestSelection(handoverRequest.id, checked as boolean)
                        }
                        className="mt-1"
                      />

                      <div className="flex-1 min-w-0">
                        {/* Patient Information Header */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <Label
                            htmlFor={`handover-request-${handoverRequest.id}`}
                            className="text-lg font-semibold cursor-pointer text-gray-900"
                          >
                            {handoverRequest.case_note?.patient?.name || 'Unknown Patient'}
                          </Label>
                          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                            MRN: {handoverRequest.case_note?.patient?.mrn || 'N/A'}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                            {handoverRequest.priority || 'Normal'}
                          </Badge>
                        </div>

                        {/* Key Information Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-2">
                              <span className="text-sm font-medium text-gray-700 min-w-[100px]">Requested By:</span>
                              <span className="text-sm text-gray-900 font-medium">
                                {handoverRequest.requester?.name || 'Unknown CA'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-sm font-medium text-gray-700 min-w-[100px]">Current Holder:</span>
                              <span className="text-sm text-gray-900 font-medium">
                                {handoverRequest.current_holder?.name || 'Unknown User'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-sm font-medium text-gray-700 min-w-[100px]">Department:</span>
                              <span className="text-sm text-gray-600">
                                {handoverRequest.department?.name || handoverRequest.case_note?.department?.name || 'Unknown Department'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-start gap-2">
                              <span className="text-sm font-medium text-gray-700 min-w-[80px]">Request #:</span>
                              <span className="text-sm text-gray-600 font-mono">
                                {handoverRequest.case_note?.request_number || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-sm font-medium text-gray-700 min-w-[80px]">Purpose:</span>
                              <span className="text-sm text-gray-600">
                                {handoverRequest.case_note?.purpose || handoverRequest.reason || 'N/A'}
                              </span>
                            </div>
                            {handoverRequest.doctor && (
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-medium text-gray-700 min-w-[80px]">Doctor:</span>
                                <span className="text-sm text-gray-600">
                                  {handoverRequest.doctor.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Handover Reason */}
                        {handoverRequest.reason && (
                          <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-sm font-medium text-purple-800 mb-1">Handover Reason:</div>
                                <div className="text-sm text-purple-700">{handoverRequest.reason}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Response Notes */}
                        {handoverRequest.response_notes && (
                          <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-sm font-medium text-purple-800 mb-1">Response Notes:</div>
                                <div className="text-sm text-purple-700">{handoverRequest.response_notes}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Approval Date */}
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Approved on {new Date(handoverRequest.responded_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Handover Requests Pending Verification</h3>
                <p className="text-gray-600">
                  All your handover requests have been processed or are still pending approval.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VerifyCaseNotesPage;
