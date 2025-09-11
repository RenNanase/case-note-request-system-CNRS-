import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Building2,
  MapPin,
  FileText,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Loader2,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { requestsApi, resourcesApi } from '@/api/requests';
import type { Department, Location } from '@/types/requests';

// Form validation schema
const handoverSchema = z.object({
  handed_over_to_user_id: z.string().min(1, 'Please select a Person in Charge'),
  department_id: z.string().min(1, 'Please select a department'),
  location_id: z.string().optional(),
  handover_reason: z.string().min(10, 'Handover reason must be at least 10 characters'),
  additional_notes: z.string().optional(),
});

type HandoverFormData = z.infer<typeof handoverSchema>;

interface User {
  id: number;
  name: string;
  email: string;
  department?: {
    id: number;
    name: string;
  };
}

interface HandoverFormProps {
  caseNoteRequestId: number;
  currentPIC?: User;
  onHandoverSuccess?: () => void;
  onCancel?: () => void;
}

export function HandoverForm({
  caseNoteRequestId,
  currentPIC,
  onHandoverSuccess,
  onCancel
}: HandoverFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [caUsers, setCaUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<HandoverFormData>({
    resolver: zodResolver(handoverSchema),
    defaultValues: {
      handed_over_to_user_id: '',
      department_id: '',
      location_id: '',
      handover_reason: '',
      additional_notes: '',
    },
  });

  // Load CA users, departments, and locations
  useEffect(() => {
    const loadFormData = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        // Load CA users
        const caResponse = await resourcesApi.getUsersByRole('CA');
        console.log('🔄 HandoverForm: CA response:', caResponse);
        if (caResponse.success && caResponse.data?.users) {
          setCaUsers(caResponse.data.users);
          console.log('🔄 HandoverForm: Set CA users:', caResponse.data.users);
        } else {
          throw new Error('Failed to load Clinic Assistants');
        }

        // Load departments
        const deptResponse = await resourcesApi.getDepartments();
        console.log('🔄 HandoverForm: Department response:', deptResponse);
        if (deptResponse.success) {
          setDepartments(deptResponse.departments);
          console.log('🔄 HandoverForm: Set departments:', deptResponse.departments);
        } else {
          throw new Error('Failed to load departments');
        }

        // Load locations
        const locResponse = await resourcesApi.getLocations();
        console.log('🔄 HandoverForm: Location response:', locResponse);
        if (locResponse.success) {
          setLocations(locResponse.locations);
          console.log('🔄 HandoverForm: Set locations:', locResponse.locations);
        } else {
          throw new Error('Failed to load locations');
        }
      } catch (error: any) {
        console.error('Error loading form data:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load form data. Please try again.';
        setLoadError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []); // Remove toast dependency to prevent re-renders

  // Filter locations based on selected department - memoized to prevent re-renders
  const filteredLocations = useMemo(() => {
    return locations.filter(location =>
      !selectedDepartment || location.type === 'department' || location.label.includes(selectedDepartment)
    );
  }, [locations, selectedDepartment]);

  // Debug filtered CA users - memoized to prevent re-renders
  const filteredCAUsers = useMemo(() => {
    return caUsers.filter(ca => ca.id !== user?.id);
  }, [caUsers, user?.id]);

  // Only log once when data is ready (reduce console noise)
  useEffect(() => {
    if (caUsers.length > 0 && departments.length > 0 && locations.length > 0) {
      console.log('🔄 HandoverForm: Form data ready:', {
        caUsers: caUsers.length,
        departments: departments.length,
        locations: locations.length,
        filteredCAUsers: filteredCAUsers.length
      });
    }
  }, [caUsers.length, departments.length, locations.length, filteredCAUsers.length]);

  const onSubmit = async (data: HandoverFormData) => {
    setSubmitting(true);
    try {
      const response = await requestsApi.createHandover({
        case_note_request_id: caseNoteRequestId,
        handed_over_to_user_id: parseInt(data.handed_over_to_user_id),
        department_id: parseInt(data.department_id),
        location_id: data.location_id && data.location_id !== 'none' ? parseInt(data.location_id) : undefined,
        handover_reason: data.handover_reason,
        additional_notes: data.additional_notes || undefined,
      });

      if (response.success) {
        // Show success toast
        toast({
          title: 'Success',
          description: response.message || 'Case note handover created successfully!',
          variant: 'success',
        });

        // Reset form
        reset();

        // Call success callback
        onHandoverSuccess?.();
      } else {
        throw new Error(response.message || 'Failed to create handover');
      }
    } catch (error: any) {
      console.error('Handover error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create handover. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading handover form...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-semibold text-gray-900">Failed to Load Form</h3>
            <p className="text-gray-600">{loadError}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <ArrowUpRight className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl font-bold text-blue-900">
              Case Note Handover
            </CardTitle>
          </div>
          <CardDescription className="text-blue-700">
            Transfer responsibility for this case note to another Clinic Assistant
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Current Status Card */}
      {currentPIC && (
        <Card className="border-2 border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg font-semibold text-amber-900">
                Current Person in Charge
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-900">{currentPIC.name}</p>
                <p className="text-sm text-amber-700">{currentPIC.email}</p>
                {currentPIC.department && (
                  <Badge variant="outline" className="mt-1 bg-amber-100 text-amber-800 border-amber-200">
                    {currentPIC.department.name}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Handover Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Person in Charge Selection */}
          <Card className="border-2 border-green-100 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg font-semibold text-green-900">
                  New Person in Charge
                </CardTitle>
              </div>
              <CardDescription className="text-green-700">
                Select the Clinic Assistant who will be responsible for this case note
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="handed_over_to_user_id" className="text-green-800 font-medium">
                  Clinic Assistant *
                </Label>
                                <Select
                  value={watch('handed_over_to_user_id') || ''}
                  onValueChange={(value) => {
                    setValue('handed_over_to_user_id', value);
                  }}
                >
                  <SelectTrigger className="border-green-200 bg-white">
                    <SelectValue placeholder="Select a Clinic Assistant" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {filteredCAUsers.map((ca) => (
                      <SelectItem key={ca.id} value={ca.id.toString()}>
                        {ca.name} ({ca.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.handed_over_to_user_id && (
                  <p className="text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.handed_over_to_user_id.message}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Department Selection */}
          <Card className="border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-violet-50">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg font-semibold text-purple-900">
                  New Department
                </CardTitle>
              </div>
              <CardDescription className="text-purple-700">
                Select the department where the case note will be located
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="department_id" className="text-purple-800 font-medium">
                  Department *
                </Label>
                                <Select
                  value={watch('department_id') || ''}
                  onValueChange={(value) => {
                    setValue('department_id', value);
                    setSelectedDepartment(value);
                  }}
                >
                  <SelectTrigger className="border-purple-200 bg-white">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {departments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value.toString()}>
                        {dept.label} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department_id && (
                  <p className="text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.department_id.message}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location Selection */}
          <Card className="border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-lg font-semibold text-orange-900">
                  Specific Location
                </CardTitle>
              </div>
              <CardDescription className="text-orange-700">
                Optional: Select a specific location within the department
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location_id" className="text-orange-800 font-medium">
                  Location
                </Label>
                                <Select
                  value={watch('location_id') || ''}
                  onValueChange={(value) => {
                    setValue('location_id', value);
                  }}
                >
                  <SelectTrigger className="border-orange-200 bg-white">
                    <SelectValue placeholder="Select a location (optional)" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    <SelectItem value="none">No specific location</SelectItem>
                    {filteredLocations.map((location) => (
                      <SelectItem key={location.value} value={location.value.toString()}>
                        {location.label} ({location.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Handover Reason */}
          <Card className="border-2 border-red-100 bg-gradient-to-br from-red-50 to-pink-50">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-red-600" />
                <CardTitle className="text-lg font-semibold text-red-900">
                  Handover Reason
                </CardTitle>
              </div>
              <CardDescription className="text-red-700">
                Explain why this case note needs to be handed over
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="handover_reason" className="text-red-800 font-medium">
                  Reason *
                </Label>
                <Textarea
                  {...register('handover_reason')}
                  placeholder="e.g., Patient transferred to different ward, doctor requested case note for consultation..."
                  className="border-red-200 bg-white min-h-[100px]"
                />
                {errors.handover_reason && (
                  <p className="text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.handover_reason.message}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Notes - Full Width */}
        <Card className="border-2 border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-lg font-semibold text-indigo-900">
                Additional Information
              </CardTitle>
            </div>
            <CardDescription className="text-indigo-700">
              Any additional details or special instructions for the new Person in Charge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="additional_notes" className="text-indigo-800 font-medium">
                Additional Notes
              </Label>
              <Textarea
                {...register('additional_notes')}
                placeholder="Optional: Add any additional information, special handling instructions, or context..."
                className="border-indigo-200 bg-white min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card className="border-2 border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-600">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">
                  This handover will be sent to MR Staff for acknowledgment
                </span>
              </div>
              <div className="flex items-center space-x-3">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={submitting}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Handover...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Create Handover
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
