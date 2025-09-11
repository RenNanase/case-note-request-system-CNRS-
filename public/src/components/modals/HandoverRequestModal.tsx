import { useState, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { requestsApi, resourcesApi } from '@/api/requests';
import { useToast } from '@/contexts/ToastContext';
import type { Patient, Department, Location, Doctor } from '@/types/requests';

// Form schema
const handoverRequestSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  department_id: z.number().min(1, 'Please select a department'),
  location_id: z.number().optional(),
  doctor_id: z.number().optional(),
});

type HandoverRequestForm = z.infer<typeof handoverRequestSchema>;

interface HandoverRequestModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function HandoverRequestModal({
  patient,
  isOpen,
  onClose,
  onSuccess
}: HandoverRequestModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const form = useForm<HandoverRequestForm>({
    resolver: zodResolver(handoverRequestSchema),
    defaultValues: {
      reason: '',
      priority: 'normal',
      department_id: 0,
      location_id: undefined,
      doctor_id: undefined,
    },
  });

  // Load resources
  useEffect(() => {
    if (isOpen) {
      loadResources();
    }
  }, [isOpen]);

  const loadResources = async () => {
    try {
      const [deptResponse, locResponse, docResponse] = await Promise.all([
        resourcesApi.getDepartments(),
        resourcesApi.getLocations(),
        resourcesApi.getDoctors()
      ]);

      if (deptResponse?.success) setDepartments(deptResponse.departments || []);
      if (locResponse?.success) setLocations(locResponse.locations || []);
      if (docResponse?.success) setDoctors(docResponse.doctors || []);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const onSubmit = async (data: HandoverRequestForm) => {
    if (!patient) return;

    console.log('🔵 HandoverRequestModal: Patient data:', patient);
    console.log('🔵 HandoverRequestModal: case_note_request_id:', patient.case_note_request_id);

    setSubmitting(true);
    try {
      let caseNoteRequestId = patient.case_note_request_id;

      // If we don't have the case note request ID, try to find it
      if (!caseNoteRequestId) {
        console.log('🔵 No case_note_request_id found, trying to find it...');

        // Get the case note request ID for this patient
        const caseNoteResponse = await requestsApi.getCaseNoteRequestId(patient.mrn);

        if (caseNoteResponse.success && caseNoteResponse.data?.case_note_request_id) {
          caseNoteRequestId = caseNoteResponse.data.case_note_request_id;
          console.log('🔵 Found case note request ID:', caseNoteRequestId);
        }
      }

      // Check if we have the case note request ID
      if (!caseNoteRequestId) {
        console.error('❌ No case_note_request_id found for patient:', patient);
        throw new Error('No case note request found for this patient');
      }

      console.log('🔵 Submitting handover request for case note ID:', caseNoteRequestId);
      console.log('🔵 Form data:', data);

      // Submit handover request for the case note
      const response = await requestsApi.requestHandover(caseNoteRequestId, data);

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Handover request submitted successfully',
          variant: 'success',
        });
        form.reset();
        onClose();
        onSuccess?.();
      } else {
        throw new Error(response.message || 'Failed to submit handover request');
      }
    } catch (error: any) {
      console.error('Error submitting handover request:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to submit handover request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !patient) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl">Request Handover</CardTitle>
            <CardDescription>
              Request handover for case note held by another CA
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          {/* Patient Information */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Patient Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-medium">{patient.name}</span>
              </div>
              <div>
                <span className="text-gray-500">MRN:</span>
                <span className="ml-2 font-medium">{patient.mrn}</span>
              </div>
              <div>
                <span className="text-gray-500">Currently held by:</span>
                <span className="ml-2 font-medium text-red-600">
                  {patient.current_holder?.name || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <Badge variant="destructive" className="ml-2">
                  Unavailable
                </Badge>
              </div>
            </div>
          </div>

          {/* Handover Request Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Handover Request *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please explain why you need this case note..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a clear reason for requesting this case note from the current holder.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.value} value={dept.value.toString()}>
                              {dept.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((loc) => (
                            <SelectItem key={loc.value} value={loc.value.toString()}>
                              {loc.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="doctor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select doctor (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {doctors.map((doc) => (
                          <SelectItem key={doc.value} value={doc.value.toString()}>
                            {doc.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
