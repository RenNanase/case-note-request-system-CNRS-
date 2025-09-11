import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, User, FileText, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

interface ReturnedCaseNote {
  id: number;
  patient: {
    id: number;
    name: string;
    mrn: string;
  };
  department: {
    id: number;
    name: string;
    code: string;
  };
  doctor: {
    id: number;
    name: string;
  };
  returned_at: string;
  returned_by_user: {
    id: number;
    name: string;
  };
  return_notes?: string;
  status: string;
}

interface CAReturnSubmission {
  ca_user_id: number;
  ca_name: string;
  submission_date: string;
  case_notes: ReturnedCaseNote[];
  total_count: number;
}

const MRStaffReturnedCaseNotesPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [returnSubmissions, setReturnSubmissions] = useState<CAReturnSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<CAReturnSubmission | null>(null);
  const [selectedCaseNotes, setSelectedCaseNotes] = useState<number[]>([]);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Debug user info
  useEffect(() => {
    console.log('Current user:', user);
    console.log('User roles:', user?.roles);
  }, [user]);



  useEffect(() => {
    loadReturnSubmissions();
  }, []);

  const loadReturnSubmissions = async () => {
    try {
      setLoading(true);
      console.log('Loading returned submissions...');
      console.log('Auth token:', localStorage.getItem('cnrs_token') ? 'Present' : 'Missing');

      const response = await fetch('/api/case-notes/returned-submissions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('API Response status:', response.status);
      console.log('API Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('API Response data:', data);

        if (data.success) {
          console.log('Setting return submissions:', data.submissions);
          const newSubmissions = data.submissions || [];
          setReturnSubmissions(newSubmissions);

          // If we're currently viewing a submission that no longer exists, go back to list
          if (selectedSubmission && !newSubmissions.find((s: CAReturnSubmission) => s.ca_user_id === selectedSubmission.ca_user_id)) {
            setSelectedSubmission(null);
          }
        } else {
          console.error('API Error:', data.message);
          toast({
            title: 'Error',
            description: data.message || 'Failed to load returned case notes',
            variant: 'destructive',
          });
        }
      } else {
        const errorText = await response.text();
        console.error('HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Error loading returned case notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load returned case notes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmissionClick = (submission: CAReturnSubmission) => {
    setSelectedSubmission(submission);
    setSelectedCaseNotes([]);
    setVerificationNotes('');
    setRejectionReason('');
  };

  const handleBackToList = () => {
    setSelectedSubmission(null);
    setSelectedCaseNotes([]);
    setVerificationNotes('');
    setRejectionReason('');
  };

  const handleCaseNoteSelection = (caseNoteId: number, checked: boolean) => {
    if (checked) {
      setSelectedCaseNotes(prev => [...prev, caseNoteId]);
    } else {
      setSelectedCaseNotes(prev => prev.filter(id => id !== caseNoteId));
    }
  };

  const handleVerifyCaseNotes = async () => {
    if (selectedCaseNotes.length === 0) {
      toast({
        title: 'Warning',
        description: 'Please select at least one case note to verify',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/case-notes/verify-returned', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          case_note_ids: selectedCaseNotes,
          verification_notes: verificationNotes,
          action: 'verify'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: 'Success',
            description: `Successfully verified ${selectedCaseNotes.length} case note(s)`,
            variant: 'success',
          });

                    // Refresh the data and update the selected submission
          await loadReturnSubmissions();

          // Update the selected submission with fresh data
          if (selectedSubmission) {
            const updatedSubmission = returnSubmissions.find(s => s.ca_user_id === selectedSubmission.ca_user_id);
            if (updatedSubmission && updatedSubmission.case_notes.length > 0) {
              setSelectedSubmission(updatedSubmission);
            } else {
              // If no more case notes for this CA, go back to list
              setSelectedSubmission(null);
              toast({
                title: 'Info',
                description: 'All case notes for this CA have been processed. Returning to main list.',
                variant: 'default',
              });
            }
          }

          // Reset form
          setSelectedCaseNotes([]);
          setVerificationNotes('');
        } else {
          toast({
            title: 'Error',
            description: data.message || 'Failed to verify case notes',
            variant: 'destructive',
          });
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify case notes');
      }
    } catch (error) {
      console.error('Error verifying case notes:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to verify case notes',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectCaseNotes = async () => {
    if (selectedCaseNotes.length === 0) {
      toast({
        title: 'Warning',
        description: 'Please select at least one case note to reject',
        variant: 'destructive',
      });
      return;
    }

    if (!rejectionReason.trim()) {
      toast({
        title: 'Warning',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/case-notes/verify-returned', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          case_note_ids: selectedCaseNotes,
          rejection_reason: rejectionReason,
          action: 'reject'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: 'Rejected',
            description: `Successfully rejected ${selectedCaseNotes.length} case note(s)`,
            variant: 'destructive',
          });

                    // Refresh the data and update the selected submission
          await loadReturnSubmissions();

          // Update the selected submission with fresh data
          if (selectedSubmission) {
            const updatedSubmission = returnSubmissions.find(s => s.ca_user_id === selectedSubmission.ca_user_id);
            if (updatedSubmission && updatedSubmission.case_notes.length > 0) {
              setSelectedSubmission(updatedSubmission);
            } else {
              // If no more case notes for this CA, go back to list
              setSelectedSubmission(null);
              toast({
                title: 'Info',
                description: 'All case notes for this CA have been processed. Returning to main list.',
                variant: 'default',
              });
            }
          }

          // Reset form
          setSelectedCaseNotes([]);
          setRejectionReason('');
        } else {
          toast({
            title: 'Error',
            description: data.message || 'Failed to reject case notes',
            variant: 'destructive',
          });
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject case notes');
      }
    } catch (error) {
      console.error('Error rejecting case notes:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject case notes',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading returned case notes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (selectedSubmission) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleBackToList}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Returned Case Notes - {selectedSubmission.ca_name}
          </h1>
          <p className="text-gray-600">
            Submitted on {new Date(selectedSubmission.submission_date).toLocaleString()}
          </p>
        </div>

        <div className="grid gap-4">
          {selectedSubmission.case_notes.map((caseNote) => (
            <Card key={caseNote.id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <Checkbox
                        checked={selectedCaseNotes.includes(caseNote.id)}
                        onCheckedChange={(checked) =>
                          handleCaseNoteSelection(caseNote.id, checked as boolean)
                        }
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {caseNote.patient.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          MRN: {caseNote.patient.mrn} • {caseNote.department.name}
                        </p>
                      </div>
                    </div>

                    <div className="ml-8 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>Doctor: {caseNote.doctor.name}</span>
                      </div>

                                             <div className="flex items-center gap-2 text-sm text-gray-600">
                         <Calendar className="h-4 w-4" />
                         <span>Returned: {new Date(caseNote.returned_at).toLocaleString()}</span>
                       </div>

                      {caseNote.return_notes && (
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <FileText className="h-4 w-4 mt-0.5" />
                          <span>Notes: {caseNote.return_notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Badge variant="secondary">
                    {caseNote.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedCaseNotes.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Action Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Notes (Optional)
                </label>
                <Textarea
                  placeholder="Add any notes about the verification process..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (Required for rejection)
                </label>
                <Textarea
                  placeholder="Explain why these case notes are being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleVerifyCaseNotes}
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verify Selected ({selectedCaseNotes.length})
                </Button>

                <Button
                  onClick={handleRejectCaseNotes}
                  disabled={submitting || !rejectionReason.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Selected ({selectedCaseNotes.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
            <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Returned Case Notes
        </h1>
        <p className="text-gray-600">
          Review and verify case notes returned by CA users
        </p>
      </div>

      {returnSubmissions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No returned case notes
            </h3>
            <p className="text-gray-600">
              There are currently no case notes waiting for verification.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {returnSubmissions.map((submission) => (
            <Card
              key={submission.ca_user_id}
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
              onClick={() => handleSubmissionClick(submission)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  {submission.ca_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                                     <div className="flex items-center gap-2 text-sm text-gray-600">
                     <Calendar className="h-4 w-4" />
                     <span>{new Date(submission.submission_date).toLocaleString()}</span>
                   </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    <span>{submission.total_count} case note(s) returned</span>
                  </div>

                  <Badge variant="outline" className="w-fit">
                    Pending Verification
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MRStaffReturnedCaseNotesPage;
