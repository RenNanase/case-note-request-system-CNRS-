import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, AlertTriangle, Package, Users, User, FileText } from 'lucide-react';
import { requestsApi } from '@/api/requests';
import { useToast } from '@/contexts/ToastContext';

const verifyIndividualSchema = z.object({
  received_case_notes: z.array(z.number()).min(0, 'At least one case note must be selected'),
  verification_notes: z.string().optional(),
});

type VerifyIndividualForm = z.infer<typeof verifyIndividualSchema>;

interface CaseNote {
  id: number;
  patient: {
    id: number;
    name: string;
    mrn: string;
    nationality_id?: string;
  };
  status: string;
  is_received?: boolean;
  received_at?: string;
  received_by?: {
    name: string;
  };
}

interface BatchRequest {
  id: number;
  batch_number: string;
  status: string;
  approved_count?: number;
  received_count?: number;
  requests?: CaseNote[];
}

interface VerifyIndividualReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchRequest: BatchRequest | null;
}

export const VerifyIndividualReceiptModal: React.FC<VerifyIndividualReceiptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  batchRequest,
}) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [approvedCaseNotes, setApprovedCaseNotes] = useState<CaseNote[]>([]);

  const form = useForm<VerifyIndividualForm>({
    resolver: zodResolver(verifyIndividualSchema),
    defaultValues: {
      received_case_notes: [],
      verification_notes: '',
    },
  });

  const { watch, reset, setValue } = form;
  const selectedCaseNotes = watch('received_case_notes');

  // Load approved case notes for this batch
  useEffect(() => {
    if (isOpen && batchRequest) {
      // Filter approved case notes
      const approved = batchRequest.requests?.filter(req => req.status === 'approved') || [];
      setApprovedCaseNotes(approved);

      // Pre-select already received case notes
      const alreadyReceived = approved
        .filter(req => req.is_received)
        .map(req => req.id);

      reset({
        received_case_notes: alreadyReceived,
        verification_notes: '',
      });
      setSubmitError(null);
    }
  }, [isOpen, batchRequest, reset]);

  const handleCaseNoteToggle = (caseNoteId: number, checked: boolean) => {
    const currentSelected = selectedCaseNotes || [];
    if (checked) {
      setValue('received_case_notes', [...currentSelected, caseNoteId]);
    } else {
      setValue('received_case_notes', currentSelected.filter(id => id !== caseNoteId));
    }
  };

  const onSubmit = async (data: VerifyIndividualForm) => {
    if (!batchRequest) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await requestsApi.verifyIndividualReceipt(batchRequest.id, {
        received_case_notes: data.received_case_notes,
        verification_notes: data.verification_notes || undefined,
      });

      if (response.success) {
        toast({
          title: 'Verification Complete',
          description: response.message || 'Case notes verified successfully',
          variant: 'success',
        });
        onSuccess();
        onClose();
      } else {
        setSubmitError(response.message || 'Failed to verify case notes');
      }
    } catch (error) {
      console.error('Error verifying individual receipt:', error);
      setSubmitError('An error occurred while verifying case notes. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!batchRequest) return null;

  const totalApproved = approvedCaseNotes.length;
  const totalSelected = selectedCaseNotes?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Verify Individual Case Notes</span>
          </DialogTitle>
          <DialogDescription>
            Mark each case note that you have physically received for batch{' '}
            <span className="font-medium">{batchRequest.batch_number}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Batch Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Batch Number:</span>
              <span className="font-mono text-sm">{batchRequest.batch_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Approved Case Notes:</span>
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{totalApproved}</span>
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Currently Selected:</span>
              <Badge variant={totalSelected === totalApproved ? "default" : "secondary"} className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3" />
                <span>{totalSelected}/{totalApproved}</span>
              </Badge>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Case Notes List */}
              <div>
                <FormLabel className="text-base font-medium mb-4 block">
                  Select Case Notes Received
                </FormLabel>
                <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {approvedCaseNotes.map((caseNote) => {
                    const isSelected = selectedCaseNotes?.includes(caseNote.id) || false;
                    const isAlreadyReceived = caseNote.is_received;

                    return (
                      <div
                        key={caseNote.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                          isSelected ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleCaseNoteToggle(caseNote.id, checked as boolean)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-900">{caseNote.patient.name}</span>
                            {isAlreadyReceived && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Already Received
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center space-x-4">
                              <span>MRN: {caseNote.patient.mrn}</span>
                              {caseNote.patient.nationality_id && (
                                <span>NRIC: {caseNote.patient.nationality_id}</span>
                              )}
                            </div>
                            {isAlreadyReceived && caseNote.received_at && (
                              <div className="text-xs text-green-600">
                                Received: {new Date(caseNote.received_at).toLocaleString()}
                                {caseNote.received_by && ` by ${caseNote.received_by.name}`}
                              </div>
                            )}
                          </div>
                        </div>
                        <FileText className="h-4 w-4 text-gray-400 mt-1" />
                      </div>
                    );
                  })}
                </div>
                <FormDescription className="mt-2">
                  Check each case note that you have physically received. You can submit partial verification if some case notes are not yet available.
                </FormDescription>
              </div>

              {/* Progress Alert */}
              {totalSelected !== totalApproved && totalApproved > 0 && (
                <Alert variant="default" className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    You have selected {totalSelected} out of {totalApproved} approved case notes.
                    Unselected case notes will remain pending for future verification.
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="verification_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes about the case notes received..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Add any relevant information about the received case notes, especially if not all are available.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {submitError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <DialogFooter className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Submit Verification</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
