import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { requestsApi } from '@/api/requests';
import {
  Calendar,
  FileText,
  CheckCircle2,
  Loader2,
  Package,
  RefreshCw,
  MessageSquare,
  Users,
  UserCheck
} from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
}

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
  verified_on_behalf_by?: {
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
  on_behalf_of?: {
    id: number;
    name: string;
  };
}

interface GroupedCaseNotes {
  [date: string]: ApprovedCaseNote[];
}

interface VerificationSubmission {
  case_note_ids: number[];
  verification_notes?: string;
  on_behalf_of_user_id: number;
}

const VerifyOnBehalfPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [approvedCaseNotes, setApprovedCaseNotes] = useState<ApprovedCaseNote[]>([]);
  const [selectedCaseNotes, setSelectedCaseNotes] = useState<Set<number>>(new Set());
  const [verificationNotes, setVerificationNotes] = useState('');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

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

  // Load all CA users for selection
  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await requestsApi.getCAUsers();

      if (response.success) {
        setUsers(response.users || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load users',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setUsersLoading(false);
    }
  };

  // Load approved case notes for selected user
  const loadApprovedCaseNotesForUser = async (userId: string) => {
    if (!userId) {
      setApprovedCaseNotes([]);
      return;
    }

    try {
      setLoading(true);
      const response = await requestsApi.getApprovedCaseNotesForUser(parseInt(userId));

      if (response.success) {
        setApprovedCaseNotes(response.case_notes || []);

        // Auto-expand today's date
        const today = new Date().toISOString().split('T')[0];
        setExpandedDates(new Set([today]));
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load approved case notes for selected user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading approved case notes for user:', error);
      toast({
        title: 'Error',
        description: 'Failed to load approved case notes for selected user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRole('CA')) {
      loadUsers();
    }
  }, [hasRole]);

  useEffect(() => {
    if (selectedUserId) {
      loadApprovedCaseNotesForUser(selectedUserId);
      // Clear selections when changing user
      setSelectedCaseNotes(new Set());
      setVerificationNotes('');
    }
  }, [selectedUserId]);

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

  // Submit verification on behalf
  const handleSubmitVerificationOnBehalf = async () => {
    if (!selectedUserId) {
      toast({
        title: 'No User Selected',
        description: 'Please select a user to verify case notes on behalf of.',
        variant: 'destructive',
      });
      return;
    }

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
        on_behalf_of_user_id: parseInt(selectedUserId),
      };

      const response = await requestsApi.verifyCaseNotesOnBehalf(submissionData);

      if (response.success) {
        const selectedUser = users.find(u => u.id === parseInt(selectedUserId));
        toast({
          title: 'Success',
          description: `Successfully verified ${selectedCaseNotes.size} case note(s) on behalf of ${selectedUser?.name}.`,
          variant: 'success',
        });

        // Clear selections and reload data
        setSelectedCaseNotes(new Set());
        setVerificationNotes('');
        await loadApprovedCaseNotesForUser(selectedUserId);
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to verify case notes on behalf',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error verifying case notes on behalf:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify case notes on behalf',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
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
          <h1 className="text-3xl font-bold text-gray-900">Verify Case Notes On Behalf</h1>
          <p className="text-gray-600 mt-2">
            Select a user and verify case notes on their behalf
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => loadApprovedCaseNotesForUser(selectedUserId)}
            disabled={loading || !selectedUserId}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* User Selection */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select User
          </CardTitle>
          <CardDescription>
            Choose the user for whom you want to verify case notes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-select">Select User</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={usersLoading}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={usersLoading ? "Loading users..." : "Select a user"} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUserId && (
              <div className="p-3 bg-blue-100 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <UserCheck className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Verifying on behalf of: {users.find(u => u.id === parseInt(selectedUserId))?.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verification Form */}
      {selectedUserId && selectedCaseNotes.size > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">
              <Package className="h-5 w-5 inline mr-2" />
              Case Note Verification On Behalf ({selectedCaseNotes.size} selected)
            </CardTitle>
            <CardDescription>
              Verify receipt of case notes on behalf of {users.find(u => u.id === parseInt(selectedUserId))?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Verification Notes */}
            <div>
              <Label htmlFor="verification-notes">Verification Notes (Optional)</Label>
              <Textarea
                id="verification-notes"
                placeholder="Add any notes about the verification on behalf..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              {/* Verify Button */}
              <Button
                onClick={handleSubmitVerificationOnBehalf}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Acknowledge On Behalf
              </Button>

              {/* Clear Selection Button */}
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCaseNotes(new Set());
                  setVerificationNotes('');
                }}
                disabled={submitting}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case Notes by Date */}
      {selectedUserId && (
        <>
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
                  <p>The selected user has no approved case notes waiting for verification.</p>
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
                                  {caseNote.on_behalf_of && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                                      On behalf of: {caseNote.on_behalf_of.name}
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
                                    ✓ Received by {caseNote.verified_on_behalf_by?.name || caseNote.received_by?.name || 'N/A'} on{' '}
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
        </>
      )}
    </div>
  );
};

export default VerifyOnBehalfPage;
