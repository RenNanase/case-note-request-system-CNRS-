import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Building2,
  AlertTriangle,
  FileText,
  Send,
  Plus,
  Trash2,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PatientSearch from '@/components/patients/PatientSearch';
import { HandoverRequestModal } from '@/components/modals/HandoverRequestModal';
import { requestsApi, resourcesApi } from '@/api/requests';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type {
  Patient,
  Department,
  Doctor,
  Location,
  Priority
} from '@/types/requests';
import { cn } from '@/lib/utils';

// Case note item schema
const caseNoteSchema = z.object({
  patient_id: z.number().min(1, 'Please select a patient'),
  patient: z.object({
    id: z.number(),
    name: z.string(),
    mrn: z.string(),
    nationality_id: z.string().nullable().optional(),
    has_medical_alerts: z.boolean().optional(),
  }).optional(),
});

// Batch request form schema
const batchRequestSchema = z.object({
  case_notes: z.array(caseNoteSchema).min(1, 'Please add at least one case note').max(20, 'Maximum 20 case notes allowed'),
  department_id: z.number().min(1, 'Please select a department').or(z.literal(0)), // Allow 0 for initial state
  doctor_id: z.number().optional(),
  location_id: z.number().optional(),
  priority: z.string().min(1, 'Please select a priority'),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
  needed_date: z.string().min(1, 'Please select when case notes are needed'),
  batch_notes: z.string().optional(),
});

type BatchRequestForm = z.infer<typeof batchRequestSchema>;

interface BatchRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Step configuration
const STEPS = [
  {
    id: 'case-notes',
    title: 'Add Case Notes',
    icon: Users,
    description: 'Add patients whose case notes you need (up to 20)'
  },
  {
    id: 'department',
    title: 'Department & Doctor',
    icon: Building2,
    description: 'Choose the department and requesting doctor for all case notes'
  },
  {
    id: 'details',
    title: 'Request Details',
    icon: FileText,
    description: 'Specify priority, purpose, and additional information for the batch'
  },
  {
    id: 'review',
    title: 'Review & Submit',
    icon: CheckCircle2,
    description: 'Review all case notes and submit the batch request'
  }
];

export const BatchRequestForm: React.FC<BatchRequestFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [selectedPatientForHandover, setSelectedPatientForHandover] = useState<Patient | null>(null);

  // Debug currentStep changes
  useEffect(() => {
    console.log('Debug - currentStep changed to:', currentStep);
  }, [currentStep]);

  // Resource data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);

  // Form setup
  const form = useForm<BatchRequestForm>({
    resolver: zodResolver(batchRequestSchema),
    defaultValues: {
      case_notes: [{ patient_id: 0 }], // Start with one empty case note
      department_id: 0,
      doctor_id: undefined,
      location_id: undefined,
      priority: undefined,
      purpose: '',
      needed_date: undefined,
      batch_notes: '',
    },
  });

  const { control, watch, setValue, getValues } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'case_notes'
  });

  const watchedValues = watch(['priority', 'purpose', 'needed_date']);
  const caseNotesValues = watch('case_notes'); // Watch for changes to trigger re-validation

  // Check permissions
  useEffect(() => {
    if (!hasPermission('create_requests')) {
      onCancel?.();
      return;
    }
  }, [hasPermission, onCancel]);

  // Load resources
  useEffect(() => {
    const loadResources = async () => {
      try {
        const [departmentsRes, locationsRes, prioritiesRes] = await Promise.all([
          resourcesApi.getDepartments(),
          resourcesApi.getLocations(),
          resourcesApi.getPriorities()
        ]);

        if (departmentsRes.success) {
          setDepartments(departmentsRes.departments);
        }
        if (locationsRes.success) {
          setLocations(locationsRes.locations);
        }
        if (prioritiesRes.success) {
          setPriorities(prioritiesRes.priorities);
        }
      } catch (error) {
        console.error('Failed to load resources:', error);
        toast({
          title: 'Error',
          description: 'Failed to load form resources. Please try again.',
          variant: 'destructive',
        });
      }
    };

    loadResources();
  }, [toast]);

  // Load doctors - show all doctors regardless of department
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        // Load all doctors regardless of department selection
        const response = await resourcesApi.getDoctors();
        if (response.success) {
          setDoctors(response.doctors);
        }
      } catch (error) {
        console.error('Failed to load doctors:', error);
        setDoctors([]);
      }
    };

    loadDoctors();
  }, []); // Load all doctors once on component mount

  // Handle patient selection for a specific case note
  const handlePatientSelect = (index: number, patient: Patient) => {
    console.log(`Debug - Setting patient for case note ${index}:`, patient);

    // Check if patient is available
    if (patient.has_existing_requests && !patient.is_available) {
      let description = 'This patient is currently unavailable for a new case note request.';

      if (patient.availability_reason === 'pending_return_verification') {
        description = 'This patient\'s case note has already been returned and is pending MR staff verification. Please ask MR staff to verify or complete the case note before requesting it again.';
      } else if (patient.handover_status === 'requested' || patient.availability_reason === 'handover_requested') {
        description = 'This patient has a pending handover request and cannot be selected.';
      } else if (patient.availability_reason === 'held_by_other_ca') {
        description = 'This patient\'s case note is currently held by another CA and cannot be selected.';
      }

      toast({
        title: 'Patient Not Available',
        description,
        variant: 'destructive',
      });
      return;
    }

    setValue(`case_notes.${index}.patient_id`, patient.id);
    setValue(`case_notes.${index}.patient`, patient);
    form.clearErrors(`case_notes.${index}.patient_id`);
    console.log(`Debug - Form values after setting patient:`, getValues());
  };

  // Handle handover request
  const handleRequestHandover = (patient: Patient) => {
    console.log('🔵 BatchRequestForm: handleRequestHandover called with patient:', patient);
    console.log('🔵 BatchRequestForm: patient.case_note_request_id:', patient.case_note_request_id);
    setSelectedPatientForHandover(patient);
    setShowHandoverModal(true);
  };

  const handleHandoverRequestSuccess = () => {
    setShowHandoverModal(false);
    setSelectedPatientForHandover(null);
    // Optionally refresh patient search or show success message
  };

  // Add new case note
  const addCaseNote = () => {
            if (fields.length < 20) {
      append({ patient_id: 0 });
    }
  };

  // Remove case note
  const removeCaseNote = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Navigation functions
  const canGoNext = () => {
    switch (currentStep) {
      case 0: // Case notes step
        console.log(`Debug - Case notes values:`, caseNotesValues);
        const caseNotesValid = fields.every((_, index) => {
          const caseNote = getValues(`case_notes.${index}`);
          console.log(`Debug - Case note ${index}:`, caseNote);
          console.log(`Debug - Patient ID: ${caseNote.patient_id}, Valid: ${caseNote.patient_id && caseNote.patient_id > 0}`);
          return caseNote.patient_id && caseNote.patient_id > 0;
        });
        console.log(`Debug - Fields count: ${fields.length}, All valid: ${caseNotesValid}, Can proceed: ${caseNotesValid && fields.length > 0}`);
        return caseNotesValid && fields.length > 0;
      case 1: // Department step
        const departmentId = getValues('department_id');
        return departmentId && departmentId > 0;
      case 2: // Details step
        const [priority, purpose, needed_date] = watchedValues;
        return priority && priority !== '' &&
               purpose && purpose.trim().length >= 10 &&
               needed_date && needed_date !== '';
      default:
        return true;
    }
  };

  const goToNext = () => {
    console.log('Debug - goToNext called');
    console.log('Debug - currentStep:', currentStep);
    console.log('Debug - STEPS.length:', STEPS.length);
    console.log('Debug - canGoNext():', canGoNext());
    console.log('Debug - condition check:', currentStep < STEPS.length - 1 && canGoNext());

    // Check form validation state
    const formState = form.formState;
    console.log('Debug - Form errors:', formState.errors);
    console.log('Debug - Form is valid:', formState.isValid);
    console.log('Debug - Form is dirty:', formState.isDirty);
    console.log('Debug - Form values:', getValues());

    if (currentStep < STEPS.length - 1 && canGoNext()) {
      console.log('Debug - About to set currentStep to:', currentStep + 1);
      setCurrentStep(prev => {
        console.log('Debug - setCurrentStep called with prev:', prev);
        return prev + 1;
      });
    } else {
      console.log('Debug - goToNext condition failed');
    }
  };

  const goToPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Form submission
  const onSubmit = async (data: BatchRequestForm) => {
    if (submitting || submitted) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitted(true);

    try {
      // Transform data for API
      const apiData = {
        case_notes: data.case_notes.map(cn => ({
          patient_id: cn.patient_id,
        })),
        department_id: data.department_id,
        doctor_id: data.doctor_id || undefined,
        location_id: data.location_id || undefined,
        priority: data.priority,
        purpose: data.purpose,
        needed_date: data.needed_date,
        batch_notes: data.batch_notes || undefined,
      };

      const response = await requestsApi.createBatchRequest(apiData);

      if (response.success) {
        toast({
          title: 'Success',
          description: `Batch request created successfully with ${data.case_notes.length} case notes!`,
          variant: 'default',
        });
        onSuccess?.();
      } else {
        const errorMsg = response.message || 'Failed to create batch request';
        setSubmitError(errorMsg);
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = 'An error occurred while creating the batch request. Please try again.';
      setSubmitError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Get priority badge with proper styling
  const getPriorityBadge = (priority: string) => {
    const config = {
      low: {
        variant: 'outline' as const,
        className: 'border-gray-300 text-gray-700 bg-gray-50'
      },
      normal: {
        variant: 'outline' as const,
        className: 'border-purple-300 text-purple-700 bg-purple-50'
      },
      high: {
        variant: 'outline' as const,
        className: 'border-orange-300 text-orange-700 bg-orange-50'
      },
      urgent: {
        variant: 'outline' as const,
        className: 'border-red-300 text-red-700 bg-red-50'
      },
    };

    const configItem = config[priority.toLowerCase() as keyof typeof config] || config.normal;

    return (
      <Badge variant={configItem.variant} className={`ml-2 ${configItem.className}`}>
        {priorities.find(p => p.value === priority)?.label}
      </Badge>
    );
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-600 mt-2">
          Request access to multiple patient case notes in a single batch (up to 20 case notes)
        </p>
      </div>

      {/* Steps indicator */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors",
                      isActive ? "border-purple-600 bg-purple-50" :
                      isCompleted ? "border-green-600 bg-green-50" : "border-gray-300 bg-gray-50"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        isActive ? "text-purple-600" :
                        isCompleted ? "text-green-600" : "text-gray-400"
                      )} />
                    </div>
                    <div className="mt-2 text-center">
                      <p className={cn(
                        "text-sm font-medium",
                        isActive ? "text-purple-600" :
                        isCompleted ? "text-green-600" : "text-gray-500"
                      )}>
                        {step.title}
                      </p>
                    </div>
                  </div>

                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "w-24 h-0.5 mx-4",
                      index < currentStep ? "bg-green-300" : "bg-gray-300"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Step 0: Add Case Notes */}
          {currentStep === 0 && (
            <Card className="min-h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Add Case Notes ({fields.length}/20)</span>
                </CardTitle>
                <CardDescription>
                  Add patients whose case notes you need to request. You can add up to 20 case notes in this batch.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-8">
                {/* Simple List View */}
                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const selectedPatient = getValues(`case_notes.${index}.patient`);
                    return (
                      <div key={field.id} className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600">
                          {index + 1}
                        </div>

                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name={`case_notes.${index}.patient_id`}
                            render={() => (
                              <FormItem className="space-y-1">
                                <FormControl>
                                  <PatientSearch
                                    onPatientSelect={(patient) => handlePatientSelect(index, patient)}
                                    selectedPatient={selectedPatient}
                                    onRequestHandover={handleRequestHandover}
                                    placeholder={`Search for patient ${index + 1}...`}
                                    className="w-full"
                                  />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>

                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCaseNote(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Show summary of selected patients */}
                {fields.some((_, index) => getValues(`case_notes.${index}.patient`)) && (
                  <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-900 mb-2 flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Selected Patients ({fields.filter((_, index) => getValues(`case_notes.${index}.patient`)).length})
                    </h4>
                    <div className="space-y-2">
                      {fields.map((_, index) => {
                        const patient = getValues(`case_notes.${index}.patient`);
                        if (!patient) return null;
                        return (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <div className="w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">
                              {index + 1}
                            </div>
                            <span className="font-medium">{patient.name}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-600">MRN: {patient.mrn}</span>
                            {patient.has_medical_alerts && (
                              <span className="text-red-600 text-xs">⚠️ Medical Alert</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add more case notes */}
                {fields.length < 20 && (
                  <div className="pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCaseNote}
                      className="w-full flex items-center justify-center space-x-2 py-3 border-dashed border-2 hover:border-purple-300 hover:bg-purple-50"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Another Patient ({fields.length}/20)</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 1: Department & Doctor */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Department & Doctor</span>
                </CardTitle>
                <CardDescription>
                  Select the requesting department and doctor for all case notes in this batch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString() || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.value} value={dept.value.toString()}>
                              {dept.label} ({dept.code})
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
                  name="doctor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requesting Doctor</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                        value={field.value?.toString() || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a doctor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {doctors.map((doctor) => (
                            <SelectItem key={doctor.value} value={doctor.value.toString()}>
                              {doctor.label}
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
                      <Select onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} value={field.value?.toString() || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.value} value={location.value.toString()}>
                              {location.label} ({location.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Request Details */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Request Details</span>
                </CardTitle>
                <CardDescription>
                  Specify the priority, purpose, and when you need all the case notes in this batch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority *</FormLabel>
                      <Select onValueChange={(value) => setValue('priority', value)} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priorities.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                              {priority.label}
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
                  name="needed_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>When do you need these? *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ''}
                          onChange={(e) => setValue('needed_date', e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </FormControl>
                      <FormDescription>
                        Select the date when you need all case notes in this batch to be ready
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purpose / Reason *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please describe why you need access to these case notes..."
                          className="resize-none"
                          rows={4}
                          value={field.value || ''}
                          onChange={(e) => setValue('purpose', e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a clear explanation of why you need the case notes (minimum 10 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="batch_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Batch Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional information about this batch request..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Any additional information that applies to all case notes in this batch
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review & Submit */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Review & Submit</span>
                  </CardTitle>
                  <CardDescription>
                    Please review all the details before submitting your batch request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Case Notes Summary */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Case Notes ({fields.length} patients)
                    </h4>
                    <div className="space-y-3">
                      {fields.map((_, index) => {
                        const patient = getValues(`case_notes.${index}.patient`);
                        return patient ? (
                          <div key={index} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium">{index + 1}. {patient.name}</h5>
                                <div className="text-sm text-gray-600 space-y-1 mt-1">
                                  <p>MRN: {patient.mrn}</p>
                                  <p>NRIC/PASSPORT: {patient.nationality_id || 'Not available'}</p>
                                </div>
                              </div>
                              {patient.has_medical_alerts && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Medical Alerts
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Department & Doctor */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      Department & Doctor
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <p><span className="font-medium">Department:</span> {departments.find(d => d.value === getValues('department_id'))?.label}</p>
                      {getValues('doctor_id') && (
                        <p><span className="font-medium">Doctor:</span> {doctors.find(d => d.value === getValues('doctor_id'))?.label}</p>
                      )}
                      {getValues('location_id') && (
                        <p><span className="font-medium">Location:</span> {locations.find(l => l.value === getValues('location_id'))?.label}</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Request Details */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Request Details
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Priority:</span>
                        {getPriorityBadge(getValues('priority'))}
                      </div>
                      <div>
                        <span className="font-medium">Needed by:</span>
                        <div className="mt-1 flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          {formatDate(getValues('needed_date'))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Purpose:</span>
                        <p className="mt-1 text-gray-600">{getValues('purpose')}</p>
                      </div>
                      {getValues('batch_notes') && (
                        <div>
                          <span className="font-medium">Batch Notes:</span>
                          <p className="mt-1 text-gray-600">{getValues('batch_notes')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {submitError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={goToPrev}
              disabled={currentStep === 0}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={() => {
                  console.log('Debug - Next button clicked');
                  console.log('Debug - Current step:', currentStep);
                  console.log('Debug - Can go next:', canGoNext());
                  goToNext();
                }}
                disabled={!canGoNext()}
                className="flex items-center space-x-2"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center space-x-4">
                {submitted && !submitting && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Batch request submitted successfully!</span>
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={submitting || submitted}
                  className="flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating Batch Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>{submitted ? 'Batch Request Submitted' : 'Submit Batch Request'}</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </form>
      </Form>

      {/* Handover Request Modal */}
      <HandoverRequestModal
        patient={selectedPatientForHandover}
        isOpen={showHandoverModal}
        onClose={() => setShowHandoverModal(false)}
        onSuccess={handleHandoverRequestSuccess}
      />
    </div>
  );

  // Debug logging
  console.log('🔵 BatchRequestForm: Modal state - isOpen:', showHandoverModal, 'patient:', selectedPatientForHandover?.name);
};
