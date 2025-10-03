import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, FileText, Users, Building2, MapPin, User, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PatientSearch from '@/components/patients/PatientSearch';
import { resourcesApi } from '@/api/requests';
import { openedCaseNotesApi } from '@/api/openedCaseNotes';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Patient,
  Department,
  Doctor,
  Location
} from '@/types/requests';
import type { OpenedCaseNote } from '@/api/openedCaseNotes';

// Form validation schema
const openCaseNoteSchema = z.object({
  patient_id: z.number().min(1, 'Please select a case note'),
  department_id: z.number().min(1, 'Please select a department'),
  location_id: z.number().min(1, 'Please select a location'),
  doctor_id: z.number().min(1, 'Please select a doctor'),
  user_type: z.string().min(1, 'Please select a user type'),
  remarks: z.string().min(1, 'Please write the staff name that will be PIC'),
});

type OpenCaseNoteForm = z.infer<typeof openCaseNoteSchema>;

// User type options
const userTypeOptions = [
  { value: 'ot_staff', label: 'OT Staff' },
  { value: 'ed_staff', label: 'ED Staff' },
  { value: 'medical_staff', label: 'Medical Staff' },
  { value: 'icu_staff', label: 'ICU Staff' },
];

export default function OpenNewCaseNotePage() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Resources state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Selected patient state
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>(undefined);

  // Opened case notes list
  const [openedCaseNotes, setOpenedCaseNotes] = useState<OpenedCaseNote[]>([]);
  const [loadingCaseNotes, setLoadingCaseNotes] = useState(false);
  const [returningCaseNote, setReturningCaseNote] = useState<number | null>(null);

  const form = useForm<OpenCaseNoteForm>({
    resolver: zodResolver(openCaseNoteSchema),
    defaultValues: {
      patient_id: 0,
      department_id: 0,
      location_id: 0,
      doctor_id: 0,
      user_type: '',
      remarks: '',
    },
  });

  const { setValue } = form;

  // Load resources on component mount
  useEffect(() => {
    const loadResources = async () => {
      try {
        const [departmentsRes, doctorsRes, locationsRes] = await Promise.all([
          resourcesApi.getDepartments(),
          resourcesApi.getDoctors(),
          resourcesApi.getLocations(),
        ]);

        setDepartments(departmentsRes.departments);
        setDoctors(doctorsRes.doctors);
        setLocations(locationsRes.locations);
      } catch (error) {
        console.error('Error loading resources:', error);
      }
    };

    loadResources();
    loadOpenedCaseNotes();
  }, []);

  // Load opened case notes
  const loadOpenedCaseNotes = async () => {
    try {
      setLoadingCaseNotes(true);
      const response = await openedCaseNotesApi.getAll();
      if (response.success) {
        setOpenedCaseNotes(response.data || []);
      }
    } catch (error) {
      console.error('Error loading opened case notes:', error);
    } finally {
      setLoadingCaseNotes(false);
    }
  };

  // Check permissions
  if (!hasRole('MR_STAFF')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">Only MR Staff can access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle return & received action
  const handleReturnAndReceived = async (caseNoteId: number) => {
    try {
      setReturningCaseNote(caseNoteId);
      const response = await openedCaseNotesApi.deactivateCaseNote(caseNoteId);

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Case note marked as returned and received',
          variant: 'success',
        });
        loadOpenedCaseNotes(); // Reload the list
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to mark case note as returned',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error marking case note as returned:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setReturningCaseNote(null);
    }
  };

  // Handle form submission
  const onSubmit = async (data: OpenCaseNoteForm) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await openedCaseNotesApi.openCaseNote(data);

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Case note opened successfully',
          variant: 'success',
        });
        // Reset form to default values but keep the opened case notes list
        form.reset({
          patient_id: 0,
          department_id: 0,
          location_id: 0,
          doctor_id: 0,
          user_type: '',
          remarks: '',
        });
        setSelectedPatient(undefined);
        loadOpenedCaseNotes();
        setIsModalOpen(false); // Close modal on success
      } else {
        setSubmitError(response.message || 'Failed to open case note');
        toast({
          title: 'Error',
          description: response.message || 'Failed to open case note',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error opening case note:', error);
      setSubmitError('An unexpected error occurred. Please try again.');
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setValue('patient_id', patient.id);
    setSelectedPatient(patient);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Open New Case Note</h1>
          <p className="text-gray-600 mt-1">
            Set up the initial location of a new case note for newly admitted patients
          </p>
        </div>

        {/* Open New Case Note Button */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Open New Case Note
              </DialogTitle>
              <DialogDescription>
                By default, all case notes are located at the Medical Record Department.
                When a patient is newly admitted, MR Staff must set the initial case note location.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Patient Search */}
                <FormField
                  control={form.control}
                  name="patient_id"
                  render={() => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Search & Select Case Note
                      </FormLabel>
                      <FormControl>
                        <PatientSearch
                          onPatientSelect={handlePatientSelect}
                          selectedPatient={selectedPatient}
                          placeholder="Search by MRN, NRIC, or patient name..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Department */}
                <FormField
                  control={form.control}
                  name="department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Department
                      </FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.filter(dept => dept && dept.id != null).map((dept) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Location */}
                <FormField
                  control={form.control}
                  name="location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.filter(location => location && location.id != null).map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Doctor */}
                <FormField
                  control={form.control}
                  name="doctor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Doctor
                      </FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select doctor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {doctors.filter(doctor => doctor && doctor.id != null).map((doctor) => (
                            <SelectItem key={doctor.id} value={doctor.id.toString()}>
                              {doctor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* User Type */}
                <FormField
                  control={form.control}
                  name="user_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        User Type
                      </FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Remarks */}
                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Remarks
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please write the staff name that will be PIC"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Error */}
                {submitError && (
                  <Alert variant="destructive">
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {submitting ? 'Opening Case Note...' : 'Open Case Note'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open New Case Note Form Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Open New Case Note
            </CardTitle>
            <CardDescription>
              Set up the initial location of a new case note for newly admitted patients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Plus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Ready to Open a New Case Note?</h3>
              <p className="text-gray-600 mb-4">Click the button above to open the form</p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Open New Case Note
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Opened Case Notes List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Opened Case Notes
            </CardTitle>
            <CardDescription>
              List of all case notes that have been opened by MR Staff
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCaseNotes ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading opened case notes...</p>
              </div>
            ) : openedCaseNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Case Notes Opened</h3>
                <p>No case notes have been opened yet</p>
              </div>
            ) : (
               <div className="space-y-3">
                 {openedCaseNotes.map((caseNote) => (
                   <div key={caseNote.id} className="p-4 border rounded-lg bg-green-50 border-green-200">
                     <div className="flex items-center justify-between">
                       <div>
                         <h4 className="font-medium text-green-900">{caseNote.patient_name}</h4>
                         <p className="text-sm text-green-700">{caseNote.patient_mrn}</p>
                       </div>
                       <Badge variant="outline" className="border-green-300 text-green-700 bg-green-100">{caseNote.status}</Badge>
                     </div>
                     <div className="mt-2 text-sm text-green-700">
                       <p>Department: {caseNote.department_name}</p>
                       <p>Location: {caseNote.location_name}</p>
                       <p>Doctor: {caseNote.doctor_name}</p>
                       <p>User: {caseNote.user_type}</p>
                     </div>
                     {caseNote.remarks && (
                       <div className="mt-2">
                         <p className="text-sm text-green-700">
                           <span className="font-medium">Remarks:</span> {caseNote.remarks}
                         </p>
                       </div>
                     )}
                     <div className="mt-3 flex justify-end">
                       <Button
                         onClick={() => handleReturnAndReceived(caseNote.id)}
                         disabled={returningCaseNote === caseNote.id}
                         size="sm"
                         className="bg-green-600 hover:bg-green-700 text-white"
                       >
                         {returningCaseNote === caseNote.id ? (
                           <>
                             <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                             Processing...
                           </>
                         ) : (
                           <>
                             <CheckCircle className="h-3 w-3 mr-1" />
                             Return & Received
                           </>
                         )}
                       </Button>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
