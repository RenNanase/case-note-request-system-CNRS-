import React, { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Package, Users } from 'lucide-react';
import { requestsApi } from '@/api/requests';
import { useToast } from '@/contexts/ToastContext';

const verifyReceiptSchema = z.object({
  received_count: z.number().min(0, 'Count cannot be negative'),
  verification_notes: z.string().optional(),
});

type VerifyReceiptForm = z.infer<typeof verifyReceiptSchema>;

interface BatchRequest {
  id: number;
  batch_number: string;
  approved_count?: number;
  status: string;
  request_count?: number;
  approved_request_count?: number;
  rejected_request_count?: number;
  pending_request_count?: number;
}

interface VerifyReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchRequest: BatchRequest | null;
}

export const VerifyReceiptModal: React.FC<VerifyReceiptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  batchRequest,
}) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<VerifyReceiptForm>({
    resolver: zodResolver(verifyReceiptSchema),
    defaultValues: {
      received_count: batchRequest?.approved_count || batchRequest?.approved_request_count || 0,
      verification_notes: '',
    },
  });

  const { watch, reset } = form;
  const receivedCount = watch('received_count');
  const approvedCount = batchRequest?.approved_count || batchRequest?.approved_request_count || 0;
  const countsMatch = receivedCount === approvedCount;

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen && batchRequest) {
      const defaultCount = batchRequest.approved_count || batchRequest.approved_request_count || 0;
      reset({
        received_count: defaultCount,
        verification_notes: '',
      });
      setSubmitError(null);
    }
  }, [isOpen, batchRequest, reset]);

  const onSubmit = async (data: VerifyReceiptForm) => {
    if (!batchRequest) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await requestsApi.verifyBatchReceipt(batchRequest.id, {
        received_count: data.received_count,
        verification_notes: data.verification_notes || undefined,
      });

      if (response.success) {
        toast({
          title: 'Receipt Verified',
          description: response.message || 'Batch receipt verified successfully',
          variant: 'default',
        });
        onSuccess();
        onClose();
      } else {
        setSubmitError(response.message || 'Failed to verify receipt');
      }
    } catch (error) {
      console.error('Error verifying receipt:', error);
      setSubmitError('An error occurred while verifying receipt. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!batchRequest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Verify Case Notes Received</span>
          </DialogTitle>
          <DialogDescription>
            Confirm that you have physically received the approved case notes for batch{' '}
            <span className="font-medium">{batchRequest.batch_number}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                <span>{approvedCount}</span>
              </Badge>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="received_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Case Notes Received *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max={approvedCount}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the actual number of physical case notes you received.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Count Match Status */}
              {receivedCount !== undefined && (
                <Alert variant={countsMatch ? "default" : "destructive"}>
                  <div className="flex items-center space-x-2">
                    {countsMatch ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {countsMatch ? (
                        <span className="text-green-700">
                          ✓ Count matches approved case notes ({receivedCount}/{approvedCount})
                        </span>
                      ) : (
                        <span>
                          ⚠ Count mismatch: Received {receivedCount}, Approved {approvedCount}
                        </span>
                      )}
                    </AlertDescription>
                  </div>
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
                      Add any relevant information about the received case notes, especially if counts don't match.
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
                  disabled={submitting || receivedCount === undefined}
                  className="flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Verify Receipt</span>
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
