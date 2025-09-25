import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Edit,
  AlertCircle,
  Activity,
  Users,
  UserCheck,
  UserX
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

interface DepartmentOption {
  value: number;
  label: string;
  code: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Doctor {
  id: number;
  name: string;
  department_id: number;
  department: Department;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DoctorStatistics {
  total: number;
  active: number;
  inactive: number;
}

const API_BASE_URL = '/CNRS/public/api/admin';

// Form validation schema
const doctorFormSchema = z.object({
  name: z.string().min(1, 'Doctor name is required'),
  department_id: z.number().min(1, 'Department is required'),
});

type DoctorFormData = z.infer<typeof doctorFormSchema>;

const DoctorManagementPage = () => {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [stats, setStats] = useState<DoctorStatistics | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<DoctorFormData>({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: {
      name: '',
      department_id: 0,
    },
  });

  // Check if user has admin role
  if (!hasRole('ADMIN')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadDoctorStats(),
        loadDepartments(),
        loadDoctors(),
      ]);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to initialize data');
      }
    } finally {
      setLoading(false);
    }
  };


  const getAuthHeaders = () => {
    const token = localStorage.getItem('cnrs_token');
    if (!token) {
      throw new Error('Please log in to access this page');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };
  };


  const loadDoctorStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/doctors/stats`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch doctor statistics');
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to load doctor statistics');
      }
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch(`/CNRS/public/api/resources/departments`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }

      const data = await response.json();
      if (data.success) {
        setDepartments(data.departments || []);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to load departments');
      }
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/doctors`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch doctors');
      }

      const data = await response.json();
      if (data.success) {
        // Handle paginated response structure
        const doctorsData = data.data?.data || data.data || [];
        setDoctors(Array.isArray(doctorsData) ? doctorsData : []);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to load doctors');
      }
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/doctors?search=${encodeURIComponent(searchTerm)}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      if (data.success) {
        // Handle paginated response structure
        const doctorsData = data.data?.data || data.data || [];
        setDoctors(Array.isArray(doctorsData) ? doctorsData : []);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to search doctors');
      }
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    loadDoctors().catch(error => {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to clear search');
      }
    });
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    form.reset({
      name: doctor.name,
      department_id: doctor.department_id,
    });
    setShowEditDialog(true);
  };

  const toggleDoctorStatus = async (id: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/doctors/${id}/toggle-status`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update doctor status');
      }

      const responseData = await response.json();
      if (responseData.success) {
        setDoctors(prevDoctors =>
          prevDoctors.map(doctor =>
            doctor.id === id
              ? { ...doctor, is_active: responseData.data.is_active }
              : doctor
          )
        );

        // Refresh stats
        await loadDoctorStats();

        toast({
          title: 'Success',
          description: `Doctor ${responseData.data.is_active ? 'activated' : 'deactivated'} successfully`,
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  const handleUpdateDoctor = async (data: DoctorFormData) => {
    if (!editingDoctor) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/doctors/${editingDoctor.id}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update doctor');
      }

      const responseData = await response.json();
      if (responseData.success) {
        setDoctors(prevDoctors =>
          prevDoctors.map(doctor =>
            doctor.id === editingDoctor.id
              ? { ...doctor, ...responseData.data }
              : doctor
          )
        );

        toast({
          title: 'Success',
          description: 'Doctor updated successfully',
        });

        setShowEditDialog(false);
        setEditingDoctor(null);
        form.reset();
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to update doctor');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDoctor = async (data: DoctorFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/doctors`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add doctor');
      }

      const responseData = await response.json();
      if (responseData.success) {
        setDoctors(prevDoctors => [responseData.data, ...prevDoctors]);
        
        // Update stats
        await loadDoctorStats();
        
        toast({
          title: 'Success',
          description: 'Doctor added successfully',
        });
        
        setShowAddDialog(false);
        form.reset();
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to add doctor');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Management</h1>
            <p className="text-gray-600">Manage doctors and their departments</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Management</h1>
          <p className="text-gray-600">Manage doctors and their departments</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchData}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Doctor
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Doctors</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-3xl font-bold text-green-600">{stats.active.toLocaleString()}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactive</p>
                  <p className="text-3xl font-bold text-red-600">{stats.inactive.toLocaleString()}</p>
                </div>
                <UserX className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Search doctors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isSubmitting}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              {searchTerm && (
                <Button variant="outline" onClick={clearSearch}>
                  Clear
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Doctors Table */}
      <Card>
        <CardContent className="p-6">
          <div className="border rounded-md">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Department</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {!Array.isArray(doctors) || doctors.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="h-24 text-center">
                        No doctors found
                      </td>
                    </tr>
                  ) : (
                    doctors.map((doctor) => (
                      <tr key={doctor.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4 align-middle">{doctor.name}</td>
                        <td className="p-4 align-middle">{doctor.department?.name || 'N/A'}</td>
                        <td className="p-4 align-middle">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            doctor.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {doctor.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditDoctor(doctor)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant={doctor.is_active ? 'destructive' : 'default'}
                              size="sm"
                              onClick={() => toggleDoctorStatus(doctor.id)}
                            >
                              {doctor.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Doctor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Doctor</DialogTitle>
            <DialogDescription>
              Add a new doctor to the system. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleAddDoctor)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Doctor Name</Label>
              <Input
                id="name"
                placeholder="Enter doctor name"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                onValueChange={(value) =>
                  form.setValue('department_id', parseInt(value), { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value.toString()}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.department_id && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.department_id.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Doctor Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Doctor</DialogTitle>
            <DialogDescription>
              Update the doctor's information. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleUpdateDoctor)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Doctor Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter doctor name"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Select
                onValueChange={(value) =>
                  form.setValue('department_id', parseInt(value), { shouldValidate: true })
                }
                defaultValue={editingDoctor?.department_id.toString()}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value.toString()}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.department_id && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.department_id.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default DoctorManagementPage;
