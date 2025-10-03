import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { requestsApi } from '@/api/requests';
import {
  CheckSquare,
  User,
  Loader2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface HandoverCaseNote {
  id: number;
  case_note_request_id: number;
  handed_over_at: string;
  handover_reason: string;
  additional_notes?: string;
  status: string;
  caseNoteRequest: {
    id: number;
    request_number: string;
    patient: {
      id: number;
      name: string;
      mrn: string;
    };
    department: {
      name: string;
    };
    purpose: string;
    priority: string;
  };
  handedOverBy: {
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
}

interface GroupedHandovers {
  [date: string]: HandoverCaseNote[];
}

const VerifyHandoverCaseNotesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [handovers, setHandovers] = useState<GroupedHandovers>({});
  const [selectedHandovers, setSelectedHandovers] = useState<number[]>([]);
  const [acknowledgmentNotes, setAcknowledgmentNotes] = useState('');

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

  // Load pending handovers
  const loadPendingHandovers = async () => {
    try {
      setLoading(true);
      const response = await requestsApi.getPendingHandovers();

      if (response.success) {
        const responseData = response as any;
        setHandovers(responseData.handovers || {});
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to load pending handovers',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading pending handovers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending handovers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRole('CA')) {
      loadPendingHandovers();
    }
  }, [hasRole]);

  // Handle handover selection
  const handleHandoverSelection = (handoverId: number, checked: boolean) => {
    if (checked) {
      setSelectedHandovers(prev => [...prev, handoverId]);
    } else {
      setSelectedHandovers(prev => prev.filter(id => id !== handoverId));
    }
  };

  // Handle acknowledgment submission
  const handleAcknowledgeHandovers = async () => {
    if (selectedHandovers.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one case note to acknowledge.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      // Acknowledge each selected handover
      const acknowledgmentPromises = selectedHandovers.map(handoverId =>
        requestsApi.verifyHandover(handoverId, {
          verification_notes: acknowledgmentNotes || undefined
        })
      );

      const results = await Promise.all(acknowledgmentPromises);
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        toast({
          title: 'Acknowledgment Successful',
          description: `Successfully Acknowledge ${successCount} case note(s)${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
          variant: 'default',
        });

        // Reset selection and reload
        setSelectedHandovers([]);
        setAcknowledgmentNotes('');
        await loadPendingHandovers();
      }

      if (failureCount > 0) {
        toast({
          title: 'Acknowledgment Failed',
          description: `${failureCount} case note(s) failed to acknowledge. Please try again.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error acknowledging handovers:', error);
      toast({
        title: 'Error',
        description: 'Failed to acknowledge handovers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
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

  // Check if handover is overdue (6 hours)
  const isHandoverOverdue = (handoverDate: string) => {
    const handoverTime = new Date(handoverDate);
    const now = new Date();
    const hoursDiff = (now.getTime() - handoverTime.getTime()) / (1000 * 60 * 60);
    return hoursDiff >= 6;
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

  const totalHandovers = Object.values(handovers).flat().length;
  const selectedCount = selectedHandovers.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Acknowledge Handover Case Notes</h1>
          <p className="text-gray-600 mt-1">
            Acknowledge receipt of case notes handed over to you
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total Pending</div>
          <div className="text-2xl font-bold text-purple-600">{totalHandovers}</div>
        </div>
      </div>

      {/* Acknowledgment Form */}
      {selectedCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Acknowledge {selectedCount} Case Note(s)
            </CardTitle>
            <CardDescription>
              Confirm that you have received these case notes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="acknowledgment-notes">Acknowledgment Notes (Optional)</Label>
              <Textarea
                id="acknowledgment-notes"
                placeholder="Add any notes about the acknowledgment..."
                value={acknowledgmentNotes}
                onChange={(e) => setAcknowledgmentNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAcknowledgeHandovers}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Acknowledge Received ({selectedCount})
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedHandovers([]);
                  setAcknowledgmentNotes('');
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Handover Groups */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span>Loading pending handovers...</span>
        </div>
      ) : totalHandovers === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
            <h3 className="text-lg font-medium mb-2">No Pending Handovers</h3>
            <p className="text-gray-500">You don't have any case notes waiting for acknowledgment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(handovers).map(([date, dateHandovers]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </CardTitle>
                <CardDescription>
                  {dateHandovers.length} case note(s) handed over on this date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dateHandovers.map((handover) => {
                    const isOverdue = isHandoverOverdue(handover.handed_over_at);
                    const isSelected = selectedHandovers.includes(handover.id);

                    return (
                      <div
                        key={handover.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : isOverdue
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleHandoverSelection(handover.id, checked as boolean)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{handover.caseNoteRequest.patient.name}</h4>
                              <div className="flex gap-2">
                                {getPriorityBadge(handover.caseNoteRequest.priority)}
                                {isOverdue && (
                                  <Badge variant="destructive" className="text-xs">
                                    Overdue
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="text-sm text-gray-600 space-y-1">
                              <div>MRN: {handover.caseNoteRequest.patient.mrn}</div>
                              <div>Request: {handover.caseNoteRequest.request_number}</div>
                              <div>Department: {handover.caseNoteRequest.department.name}</div>
                              <div>Purpose: {handover.caseNoteRequest.purpose}</div>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  From: {handover.handedOverBy.name}
                                </span>
                                <span className="flex items-center text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {new Date(handover.handed_over_at).toLocaleString()}
                                </span>
                              </div>
                              {handover.handover_reason && (
                                <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                                  <strong>Handover Reason:</strong> {handover.handover_reason}
                                </div>
                              )}
                              {isOverdue && (
                                <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                                  This handover is overdue. Please acknowledge as soon as possible.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VerifyHandoverCaseNotesPage;
