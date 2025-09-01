import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  FileText,
  Send
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
import { Toast } from '@/components/ui/toast';
import PatientSearch from '@/components/patients/PatientSearch';
import { requestsApi, resourcesApi } from '@/api/requests';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Patient,
  Department,
  Doctor,
  Location,
  Priority
} from '@/types/requests';
import { cn } from '@/lib/utils';

// Form validation schema
const createRequestSchema = z.object({
  patient_id: z.number().min(1, 'Please select a patient'),
  department_id: z.number().min(1, 'Please select a department'),
  doctor_id: z.number().optional(),
  location_id: z.number().optional(),
  priority: z.string().min(1, 'Please select a priority'),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
  needed_date: z.string().min(1, 'Please select when case notes are needed'),
  remarks: z.string().optional(),
});

type CreateRequestForm = z.infer<typeof createRequestSchema>;

// Step configuration
const STEPS = [
  {
    id: 'patient',
    title: 'Select Patient',
    icon: User,
    description: 'Search and select the patient for this case note request'
  },
  {
    id: 'department',
    title: 'Department & Doctor',
    icon: Building2,
    description: 'Choose the department and requesting doctor'
  },
  {
    id: 'details',
    title: 'Request Details',
    icon: FileText,
    description: 'Specify priority, purpose, and additional information'
  },
  {
    id: 'review',
    title: 'Review & Submit',
    icon: CheckCircle2,
    description: 'Review all details and submit the request'
  }
];

export default function CreateRequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showToast, setShowToast] = useState({
    open: false,
    message: '',
    type: 'success' as 'success' | 'error'
  });

  // Resource data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);

  // Debug toast state changes
  useEffect(() => {
    console.log('🔔 Toast state changed:', showToast);
  }, [showToast]);

  // Debug user permissions
  useEffect(() => {
    console.log('🔐 User debug info:', {
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions
      } : null,
      hasCreatePermission: hasPermission('create_requests'),
      hasViewPermission: hasPermission('view_requests')
    });
  }, [user, hasPermission]);

  // Form setup
  const form = useForm<CreateRequestForm>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      patient_id: 0,
      department_id: 0,
      doctor_id: undefined,
      location_id: undefined,
      priority: undefined,
      purpose: '',
      needed_date: undefined,
      remarks: '',
    },
  });

  const { watch, setValue, getValues, formState } = form;
  const selectedDepartmentId = watch('department_id');

  // Watch the form values we need for validation
  const watchedValues = watch(['priority', 'purpose', 'needed_date']);

  // Debug form state
  useEffect(() => {
    console.log('Form values changed:', getValues());
    console.log('Form errors:', formState.errors);
  }, [getValues, formState.errors]);

  // Debug button state
  useEffect(() => {
    console.log('Button state debug - currentStep:', currentStep, 'canGoNext:', canGoNext());
  }, [currentStep]);

  // Debug resources state
  useEffect(() => {
    console.log('Resources state debug:', {
      departments: departments.length,
      locations: locations.length,
      priorities: priorities.length,
      currentStep
    });
  }, [departments, locations, priorities, currentStep]);

  // Check permissions and handle pre-selected patient
  useEffect(() => {
    if (!hasPermission('create_requests')) {
      navigate('/dashboard');
      return;
    }

    // Check if patient was passed from navigation state
    const locationState = location.state as { selectedPatient?: Patient } | null;
    if (locationState?.selectedPatient) {
      setSelectedPatient(locationState.selectedPatient);
      setValue('patient_id', locationState.selectedPatient.id);
      // If patient is pre-selected, start from step 1 (Department selection)
      setCurrentStep(1);
    }
  }, [hasPermission, navigate, location.state, setValue]);

  // Load resources
  useEffect(() => {
    console.log('Resource loading useEffect triggered');
    const loadResources = async () => {
      try {
        console.log('Loading resources...');
        const [departmentsRes, locationsRes, prioritiesRes] = await Promise.all([
          resourcesApi.getDepartments(),
          resourcesApi.getLocations(),
          resourcesApi.getPriorities()
        ]);

        console.log('Resources loaded:', {
          departments: departmentsRes.success ? departmentsRes.departments.length : 'failed',
          locations: locationsRes.success ? locationsRes.locations.length : 'failed',
          priorities: prioritiesRes.success ? prioritiesRes.priorities.length : 'failed'
        });

        if (departmentsRes.success) {
          setDepartments(departmentsRes.departments);
          console.log('Departments set:', departmentsRes.departments);
        }
        if (locationsRes.success) {
          setLocations(locationsRes.locations);
          console.log('Locations set:', locationsRes.locations);
        }
        if (prioritiesRes.success) {
          setPriorities(prioritiesRes.priorities);
          console.log('Priorities set:', prioritiesRes.priorities);
        }
      } catch (error) {
        console.error('Failed to load resources:', error);
      }
    };

    loadResources();
  }, []);

  // Load doctors when department changes
  useEffect(() => {
    const loadDoctors = async () => {
      if (!selectedDepartmentId || selectedDepartmentId === 0) {
        setDoctors([]);
        setValue('doctor_id', undefined);
        return;
      }

      try {
        const response = await resourcesApi.getDoctors(selectedDepartmentId);
        if (response.success) {
          setDoctors(response.doctors);
        }
      } catch (error) {
        console.error('Failed to load doctors:', error);
        setDoctors([]);
      }
    };

    loadDoctors();
  }, [selectedDepartmentId, setValue]);

  // Handle patient selection
  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setValue('patient_id', patient.id);
    form.clearErrors('patient_id');
  };

  // Navigation functions
  const canGoNext = () => {
    console.log('canGoNext called for step:', currentStep);

    switch (currentStep) {
      case 0: // Patient step
        const patientValid = selectedPatient !== null;
        console.log('Step 0 validation:', { selectedPatient, patientValid });
        return patientValid;
      case 1: // Department step
        const departmentId = getValues('department_id');
        const deptValid = departmentId && departmentId > 0;
        console.log('Step 1 validation:', { departmentId, deptValid });
        return deptValid;
      case 2: // Details step
        const [priority, purpose, needed_date] = watchedValues;
        const priorityValid = priority && priority !== '';
        const purposeValid = purpose && purpose.trim().length >= 10;
        const dateValid = needed_date && needed_date !== '';
        const detailsValid = priorityValid && purposeValid && dateValid;
        console.log('Step 2 validation:', {
          priority, priorityValid,
          purpose, purposeLength: purpose?.length, purposeValid,
          needed_date, dateValid,
          detailsValid,
          watchedValues
        });
        return detailsValid;
      default:
        return true;
    }
  };

  const goToNext = () => {
    if (currentStep < STEPS.length - 1 && canGoNext()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Form reset function
  const resetForm = () => {
    form.reset({
      patient_id: 0,
      department_id: 0,
      doctor_id: undefined,
      location_id: undefined,
      priority: undefined,
      purpose: '',
      needed_date: undefined,
      remarks: '',
    });
    setSelectedPatient(null);
    setCurrentStep(0);
    setSubmitError(null);
    setSubmitted(false); // Reset submitted state
  };

  // Form submission
  const onSubmit = async (data: CreateRequestForm) => {
    console.log('🚀 Form submission started with data:', data);
    console.log('🔐 Permission check before submission:', {
      hasCreatePermission: hasPermission('create_requests'),
      userRoles: user?.roles,
      userPermissions: user?.permissions
    });

    // Prevent multiple submissions
    if (submitting || submitted) {
      console.log('⚠️ Form is already submitting or has been submitted, ignoring click');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitted(true);

    try {
      console.log('🚀 Making API call to create request...');
      const response = await requestsApi.createRequest(data);
      console.log('📡 API Response received:', response);
      console.log('📡 Response type:', typeof response);
      console.log('📡 Response keys:', Object.keys(response));
      console.log('📡 Response.success:', response.success);
      console.log('📡 Response.request:', response.request);
      console.log('📡 Response.message:', response.message);

      if (response.success && response.request) {
        // Success! Show success message and reset form
        console.log('✅ Request created successfully:', response.request);
        console.log('🎯 Response object:', response);
        console.log('🎯 Response.success:', response.success);
        console.log('🎯 Response.request:', response.request);

        // Show success toast
        console.log('🎉 Setting success toast...');
        const successToast = {
          open: true,
          message: 'Case note request created successfully!',
          type: 'success' as const
        };
        console.log('🎉 Success toast object:', successToast);
        setShowToast(successToast);

        // Reset form to initial state
        resetForm();

        // Delay navigation to show the success toast
        setTimeout(() => {
          // Navigate to request details or success page
          if (response.request) {
            navigate(`/requests/${response.request.id}`, {
              state: { message: 'Case note request created successfully!' }
            });
          }
        }, 2000); // Show toast for 2 seconds before navigating
      } else {
        const errorMsg = response.message || 'Failed to create request';
        console.log('❌ Request failed:', errorMsg);
        console.log('❌ Response object:', response);
        setSubmitError(errorMsg);

        // Show error toast
        console.log('❌ Setting error toast...');
        const errorToast = {
          open: true,
          message: errorMsg,
          type: 'error' as const
        };
        console.log('❌ Error toast object:', errorToast);
        setShowToast(errorToast);
      }
    } catch (error) {
      console.error('💥 Submit error details:', error);
      const errorMessage = 'An error occurred while creating the request. Please try again.';
      setSubmitError(errorMessage);

      // Show error toast
      setShowToast({
        open: true,
        message: errorMessage,
        type: 'error'
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
        className: 'border-blue-300 text-blue-700 bg-blue-50'
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
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/requests')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Requests</span>
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900">Create Case Note Request</h1>
        <p className="text-gray-600 mt-2">
          Request access to patient case notes from Medical Records department
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
                      isActive ? "border-blue-600 bg-blue-50" :
                      isCompleted ? "border-green-600 bg-green-50" : "border-gray-300 bg-gray-50"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        isActive ? "text-blue-600" :
                        isCompleted ? "text-green-600" : "text-gray-400"
                      )} />
                    </div>
                    <div className="mt-2 text-center">
                      <p className={cn(
                        "text-sm font-medium",
                        isActive ? "text-blue-600" :
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
          {/* Step 0: Patient Selection */}
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Select Patient</span>
                </CardTitle>
                <CardDescription>
                  Search for the patient whose case notes you need to request
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="patient_id"
                  render={() => (
                    <FormItem>
                      <FormLabel>Patient Search</FormLabel>
                      <FormControl>
                        <PatientSearch
                          onPatientSelect={handlePatientSelect}
                          selectedPatient={selectedPatient || undefined}
                        />
                      </FormControl>
                      <FormDescription>
                        Search by Medical Record Number (MRN), NRIC, or patient name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  Select the requesting department and doctor (optional)
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
                      <FormLabel>Requesting Doctor (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                        value={field.value?.toString() || ''}
                        disabled={!selectedDepartmentId || doctors.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !selectedDepartmentId ? "Select a department first" :
                              doctors.length === 0 ? "No doctors available" :
                              "Select a doctor"
                            } />
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
                      <FormDescription>
                        {selectedDepartmentId && doctors.length === 0 &&
                          "No doctors found for the selected department"
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
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
                  Specify the priority, purpose, and when you need the case notes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          console.log('Priority selected:', value);
                          setValue('priority', value);
                          console.log('Priority setValue called, new form values:', getValues());
                        }}
                        value={field.value || ''}
                      >
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
                      <FormLabel>When do you need this? *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ''}
                          onChange={(e) => {
                            console.log('Date changed:', e.target.value);
                            setValue('needed_date', e.target.value);
                            console.log('Date setValue called, new form values:', getValues());
                          }}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </FormControl>
                      <FormDescription>
                        Select the date when you need the case notes to be ready
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
                          onChange={(e) => {
                            console.log('Purpose changed:', e.target.value);
                            setValue('purpose', e.target.value);
                            console.log('Purpose setValue called, new form values:', getValues());
                          }}
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
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Remarks (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional information or special requirements..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Any additional information that might be helpful for processing this request
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
                    Please review all the details before submitting your request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Patient Info */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Patient Information
                    </h4>
                    {selectedPatient && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{selectedPatient.name}</h5>
                            <div className="text-sm text-gray-600 space-y-1 mt-1">
                              <p>MRN: {selectedPatient.mrn}</p>
                              <p>NRIC: {selectedPatient.nric}</p>
                            </div>
                          </div>
                          {selectedPatient.has_medical_alerts && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Medical Alerts
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
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
                      {getValues('remarks') && (
                        <div>
                          <span className="font-medium">Additional Remarks:</span>
                          <p className="mt-1 text-gray-600">{getValues('remarks')}</p>
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
                  console.log('Next button clicked, current step:', currentStep);
                  console.log('canGoNext result:', canGoNext());
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
                    <span className="text-sm font-medium">Request submitted successfully!</span>
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
                      <span>Creating Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>{submitted ? 'Request Submitted' : 'Submit Request'}</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </form>
      </Form>

      {/* Toast notifications */}
      <Toast
        message={showToast.message}
        type={showToast.type}
        isVisible={showToast.open}
        onClose={() => setShowToast(prev => ({ ...prev, open: false }))}
        duration={5000}
      />
    </div>
  );
}
