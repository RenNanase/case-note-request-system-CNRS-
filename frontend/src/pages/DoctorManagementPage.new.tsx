import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Doctor, DoctorStatistics, DepartmentOption } from '@/types/doctor';

// Form validation schema
const doctorFormSchema = z.object({
  name: z.string().min(1, 'Doctor name is required'),
  department_id: z.number().min(1, 'Department is required'),
});

type DoctorFormData = z.infer<typeof doctorFormSchema>;

const API_BASE_URL = '/CNRS/api';

export default function DoctorManagementPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [stats, setStats] = useState<DoctorStatistics | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorFormSchema),
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          fetchDoctors(),
          fetchDepartments(),
          fetchStats(),
        ]);
      } catch (err) {
        setError('Failed to load data. Please try again.');
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchDoctors = async (search = '') => {
    const url = search 
      ? `${API_BASE_URL}/admin/doctors?search=${encodeURIComponent(search)}`
      : `${API_BASE_URL}/admin/doctors`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch doctors');
    }

    const data = await response.json();
    setDoctors(Array.isArray(data) ? data : data.data || []);
  };

  const fetchDepartments = async () => {
    const response = await fetch(`${API_BASE_URL}/resources/departments`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch departments');
    }

    const data = await response.json();
    const formattedDepartments = data.success && data.departments 
      ? data.departments.map((dept: any) => ({
          value: dept.value,
          label: dept.label,
          code: dept.code || ''
        }))
      : [];
    
    setDepartments(formattedDepartments);
  };

  const fetchStats = async () => {
    const response = await fetch(`${API_BASE_URL}/admin/doctors/stats`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }

    const data = await response.json();
    setStats(data.data);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors(searchTerm);
  };

  const handleAddDoctor = async (data: DoctorFormData) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`${API_BASE_URL}/admin/doctors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add doctor');
      }

      const newDoctor = await response.json();
      setDoctors(prev => [newDoctor, ...prev]);
      setStats(prev => ({
        total: (prev?.total || 0) + 1,
        active: (prev?.active || 0) + 1,
        inactive: prev?.inactive || 0,
      }));
      
      toast({
        title: 'Success',
        description: 'Doctor added successfully',
      });
      
      reset();
      setShowAddDialog(false);
    } catch (error) {
      console.error('Error adding doctor:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add doctor',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDoctor = async (data: DoctorFormData) => {
    if (!editingDoctor) return;

    try {
      setIsSubmitting(true);
      
      const response = await fetch(`${API_BASE_URL}/admin/doctors/${editingDoctor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update doctor');
      }

      const updatedDoctor = await response.json();
      
      setDoctors(prev => 
        prev.map(doctor => 
          doctor.id === updatedDoctor.id ? updatedDoctor : doctor
        )
      );
      
      toast({
        title: 'Success',
        description: 'Doctor updated successfully',
      });
      
      setShowEditDialog(false);
      setEditingDoctor(null);
    } catch (error) {
      console.error('Error updating doctor:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update doctor',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // const handleDeleteDoctor = async (id: number) => {
  //   if (!confirm('Are you sure you want to delete this doctor?')) return;

  //   try {
  //     const response = await fetch(`${API_BASE_URL}/admin/doctors/${id}`, {
  //       method: 'DELETE',
  //       headers: {
  //         'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
  //       },
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json().catch(() => ({}));
  //       throw new Error(errorData.message || 'Failed to delete doctor');
  //     }

  //     setDoctors(prev => prev.filter(doctor => doctor.id !== id));
  //     setStats(prev => ({
  //       total: (prev?.total || 1) - 1,
  //       active: prev?.active || 0,
  //       inactive: prev?.inactive || 0,
  //     }));
      
  //     toast({
  //       title: 'Success',
  //       description: 'Doctor deleted successfully',
  //     });
  //   } catch (error) {
  //     console.error('Error deleting doctor:', error);
  //     toast({
  //       title: 'Error',
  //       description: error instanceof Error ? error.message : 'Failed to delete doctor',
  //       variant: 'destructive',
  //     });
  //   }
  // };

  const handleToggleStatus = async (doctor: Doctor) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/doctors/${doctor.id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update doctor status');
      }

      const updatedDoctor = await response.json();
      
      setDoctors(prev => 
        prev.map(d => d.id === doctor.id ? updatedDoctor : d)
      );
      
      setStats(prev => {
        if (!prev) return null;
        return {
          ...prev,
          active: updatedDoctor.is_active ? prev.active + 1 : prev.active - 1,
          inactive: updatedDoctor.is_active ? prev.inactive - 1 : prev.inactive + 1,
        };
      });
      
      toast({
        title: 'Success',
        description: `Doctor ${updatedDoctor.is_active ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling doctor status:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update doctor status',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Doctor Management</h1>
          <p className="text-muted-foreground">
            Manage doctors and their departments
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Doctor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactive Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats?.inactive || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search doctors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          {searchTerm && (
            <Button 
              type="button" 
              variant="ghost"
              onClick={() => {
                setSearchTerm('');
                fetchDoctors('');
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </div>

      {/* Doctors Table */}
      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Department</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {doctors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="h-24 text-center">
                    No doctors found
                  </td>
                </tr>
              ) : (
                doctors.map((doctor) => (
                  <tr key={doctor.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">{doctor.name}</td>
                    <td className="p-4 align-middle">
                      {departments.find(d => d.value === doctor.department_id)?.label || 'N/A'}
                    </td>
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
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingDoctor(doctor);
                            setValue('name', doctor.name);
                            setValue('department_id', doctor.department_id);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant={doctor.is_active ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => handleToggleStatus(doctor)}
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

      {/* Add Doctor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Doctor</DialogTitle>
            <DialogDescription>
              Add a new doctor to the system. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleAddDoctor)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Doctor Name</Label>
              <Input
                id="name"
                placeholder="Dr. John Doe"
                {...register('name')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                onValueChange={(value) => setValue('department_id', parseInt(value), { shouldValidate: true })}
                defaultValue=""
              >
                <SelectTrigger className={errors.department_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value.toString()}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department_id && (
                <p className="text-sm text-red-500">{errors.department_id.message}</p>
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
      <Dialog open={showEditDialog} onOpenChange={(open) => !open && setShowEditDialog(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Doctor</DialogTitle>
            <DialogDescription>
              Update the doctor's information. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {editingDoctor && (
            <form onSubmit={handleSubmit(handleEditDoctor)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Doctor Name</Label>
                <Input
                  id="edit-name"
                  placeholder="Dr. John Doe"
                  {...register('name')}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Select
                  onValueChange={(value) => setValue('department_id', parseInt(value), { shouldValidate: true })}
                  defaultValue={editingDoctor.department_id.toString()}
                >
                  <SelectTrigger className={errors.department_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value.toString()}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department_id && (
                  <p className="text-sm text-red-500">{errors.department_id.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingDoctor(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
