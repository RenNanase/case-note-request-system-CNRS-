import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Send,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { Alert, AlertDescription } from '@/components/ui/alert';
import PatientSearch from '@/components/patients/PatientSearch';
import { HandoverRequestModal } from '@/components/modals/HandoverRequestModal';
import { requestsApi, resourcesApi } from '@/api/requests';

import { useToast } from '@/contexts/ToastContext';
import type {
  Patient,
  Department,
  Doctor,
  Location,
  Priority
} from '@/types/requests';
import { cn } from '@/lib/utils';

// Form validation schema
const createIndividualRequestSchema = z.object({
  patient_id: z.number().min(1, 'Please select a patient'),
  department_id: z.number().min(1, 'Please select a department'),
  doctor_id: z.number().optional(),
  location_id: z.number().optional(),
  priority: z.string().min(1, 'Please select a priority'),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
  needed_date: z.string().min(1, 'Please select when case notes are needed'),
  remarks: z.string().optional(),
});

type CreateIndividualRequestForm = z.infer<typeof createIndividualRequestSchema>;

interface CreateIndividualRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Step configuration
const STEPS = [
  {
    id: 'patient',
    title: 'Select Patient',
    description: 'Choose the patient for this case note request',
    icon: User,
  },
  {
    id: 'details',
    title: 'Request Details',
    description: 'Specify the case note details and requirements',
    icon: FileText,
  },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Review your request before submitting',
    icon: CheckCircle2,
  },
];

export const CreateIndividualRequestForm: React.FC<CreateIndividualRequestFormProps> = ({
  onSuccess,
  onCancel,
}) => {

  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Resources state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);

  // Selected patient state
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>(undefined);

  // Handover request modal state
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [selectedPatientForHandover, setSelectedPatientForHandover] = useState<Patient | null>(null);

  const form = useForm<CreateIndividualRequestForm>({
    resolver: zodResolver(createIndividualRequestSchema),
    defaultValues: {
      patient_id: 0,
      department_id: 0,
      doctor_id: undefined,
      location_id: undefined,
      priority: '',
      purpose: '',
      needed_date: '',
      remarks: '',
    },
  });

  const { watch, setValue, formState: { errors } } = form;
  const watchedValues = watch();

  // Load resources on component mount
  useEffect(() => {
    loadResources();
  }, []);



  const loadResources = async () => {
    try {
      const [deptResponse, locResponse, priorityResponse, doctorsResponse] = await Promise.all([
        resourcesApi.getDepartments(),
        resourcesApi.getLocations(),
        resourcesApi.getPriorities(),
        resourcesApi.getDoctors(), // Load all doctors
      ]);

      if (deptResponse.success) setDepartments(deptResponse.departments);
      if (locResponse.success) setLocations(locResponse.locations);
      if (priorityResponse.success) setPriorities(priorityResponse.priorities);
      if (doctorsResponse.success) setDoctors(doctorsResponse.doctors);
    } catch (error) {
      console.error('Error loading resources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load form resources',
        variant: 'destructive',
      });
    }
  };



  const goToNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Form submission
  const onSubmit = async (data: CreateIndividualRequestForm) => {
    if (submitting || submitted) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitted(true);

    try {
      // Clean up the data - convert "none" values to undefined
      const cleanData = {
        ...data,
        doctor_id: data.doctor_id === 0 ? undefined : data.doctor_id,
        location_id: data.location_id === 0 ? undefined : data.location_id,
      };

      const response = await requestsApi.createIndividualRequest(cleanData);

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Case note request created successfully!',
          variant: 'default',
        });
        onSuccess?.();
      } else {
        const errorMsg = response.message || 'Failed to create case note request';
        setSubmitError(errorMsg);
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = 'An error occurred while creating the case note request. Please try again.';
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
    const priorityConfig = {
      low: { variant: 'secondary', className: 'bg-gray-100 text-gray-800' },
      normal: { variant: 'default', className: 'bg-purple-100 text-purple-800' },
      high: { variant: 'default', className: 'bg-orange-100 text-orange-800' },
      urgent: { variant: 'destructive', className: 'bg-red-100 text-red-800' },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal;

    return (
      <Badge variant={config.variant as any} className={config.className}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  // Get step status
  const getStepStatus = (stepNumber: number) => {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'current';
    return 'upcoming';
  };

  // Check if current step is valid
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1:
        return watchedValues.patient_id > 0;
      case 2:
        return (
          watchedValues.department_id > 0 &&
          watchedValues.priority &&
          watchedValues.purpose.length >= 10 &&
          watchedValues.needed_date
        );
      default:
        return true;
    }
  };

  // Handover request handlers
  const handleRequestHandover = (patient: Patient) => {
    console.log('🔵 Request Handover clicked for patient:', patient.name);
    setSelectedPatientForHandover(patient);
    setShowHandoverModal(true);
  };

  const handleHandoverRequestSuccess = () => {
    setShowHandoverModal(false);
    setSelectedPatientForHandover(null);
    // Refresh the form or show success message
    toast({
      title: 'Success',
      description: 'Handover request submitted successfully!',
      variant: 'default',
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const status = getStepStatus(stepNumber);
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                      status === 'completed' && 'bg-green-500 border-green-500 text-white',
                      status === 'current' && 'bg-purple-500 border-purple-500 text-white',
                      status === 'upcoming' && 'bg-gray-200 border-gray-300 text-gray-500'
                    )}
                  >
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={cn(
                      'text-sm font-medium',
                      status === 'completed' && 'text-green-600',
                      status === 'current' && 'text-purple-600',
                      status === 'upcoming' && 'text-gray-500'
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                  </div>
                </div>
                {stepNumber < STEPS.length && (
                  <div className={cn(
                    'w-16 h-0.5 mx-4',
                    status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Patient Selection */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Select Patient
                </CardTitle>
                <CardDescription>
                  Choose the patient for this case note request
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                                                 <PatientSearch
                  onPatientSelect={(patient: Patient) => {
                    setValue('patient_id', patient.id);
                    setSelectedPatient(patient);
                  }}
                  selectedPatient={selectedPatient}
                  onRequestHandover={handleRequestHandover}
                />



                {errors.patient_id && (
                  <p className="text-sm text-red-600">{errors.patient_id.message}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Request Details */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Request Details
                </CardTitle>
                <CardDescription>
                  Specify the case note details and requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                    name="doctor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doctor (All departments available)</FormLabel>
                        <Select onValueChange={(value) => {
                          if (value === 'none') {
                            field.onChange(undefined);
                          } else {
                            field.onChange(parseInt(value));
                          }
                        }} value={field.value?.toString() || 'none'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select doctor (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No doctor specified</SelectItem>
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
                        <Select onValueChange={(value) => {
                          if (value === 'none') {
                            field.onChange(undefined);
                          } else {
                            field.onChange(parseInt(value));
                          }
                        }} value={field.value?.toString() || 'none'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No location specified</SelectItem>
                                                         {locations.map((location) => (
                               <SelectItem key={location.value} value={location.value.toString()}>
                                 {location.label}
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
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {priorities.map((priority) => (
                              <SelectItem key={priority.value} value={priority.value}>
                                <div className="flex items-center gap-2">
                                  {getPriorityBadge(priority.value)}
                                  <span>{priority.label}</span>
                                </div>
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
                        <FormLabel>Needed Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          When do you need the case notes?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purpose *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe why you need these case notes..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a clear description of why you need these case notes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Remarks</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional notes or special requirements..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional additional information
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Review Your Request
                </CardTitle>
                <CardDescription>
                  Please review all details before submitting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Request Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                         <div>
                       <span className="font-medium text-gray-700">Patient:</span>
                       <span className="ml-2 text-gray-900">
                         {selectedPatient ? `${selectedPatient.name} (MRN: ${selectedPatient.mrn})` : 'Not selected'}
                       </span>
                     </div>
                                         <div>
                       <span className="font-medium text-gray-700">Department:</span>
                       <span className="ml-2 text-gray-900">
                         {departments.find(d => d.value === watchedValues.department_id)?.label || 'Not selected'}
                       </span>
                     </div>
                     <div>
                       <span className="font-medium text-gray-700">Doctor:</span>
                       <span className="ml-2 text-gray-900">
                         {watchedValues.doctor_id && watchedValues.doctor_id > 0
                           ? doctors.find(d => d.value === watchedValues.doctor_id)?.label || 'Not selected'
                           : 'No doctor specified'
                         }
                       </span>
                     </div>
                     <div>
                       <span className="font-medium text-gray-700">Location:</span>
                       <span className="ml-2 text-gray-900">
                         {watchedValues.location_id && watchedValues.location_id > 0
                           ? locations.find(l => l.value === watchedValues.location_id)?.label || 'Not selected'
                           : 'No location specified'
                         }
                       </span>
                     </div>
                    <div>
                      <span className="font-medium text-gray-700">Priority:</span>
                      <span className="ml-2">
                        {watchedValues.priority && getPriorityBadge(watchedValues.priority)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Needed Date:</span>
                      <span className="ml-2 text-gray-900">
                        {watchedValues.needed_date ? new Date(watchedValues.needed_date).toLocaleDateString() : 'Not selected'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="font-medium text-gray-700">Purpose:</span>
                    <p className="mt-1 text-gray-900">{watchedValues.purpose}</p>
                  </div>
                  {watchedValues.remarks && (
                    <div className="mt-4">
                      <span className="font-medium text-gray-700">Remarks:</span>
                      <p className="mt-1 text-gray-900">{watchedValues.remarks}</p>
                    </div>
                  )}
                </div>

                {submitError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6">
            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={goToPrev}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < STEPS.length && (
                <Button
                  type="button"
                  onClick={goToNext}
                  disabled={!isCurrentStepValid()}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {currentStep === STEPS.length && (
                <Button
                  type="submit"
                  disabled={submitting || submitted}
                  className="min-w-[120px]"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              )}
            </div>
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
};
