import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, User, Users, Search, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Form validation schema
const doctorFormSchema = z.object({
  name: z.string().min(1, 'Doctor name is required'),
  department_id: z.number().min(1, 'Department is required'),
});

type DoctorFormData = z.infer<typeof doctorFormSchema>;

interface Doctor {
  id: number;
  name: string;
  department: {
    id: number;
    name: string;
    code: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Department {
  value: number;
  label: string;
  code: string;
}

export default function DoctorManagementPage() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [activeDoctorsCount, setActiveDoctorsCount] = useState(0);
  const [totalDoctorsCount, setTotalDoctorsCount] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Doctor[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Edit functionality
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorFormSchema),
  });

  // Check if user has admin role
  if (!hasRole('ADMIN')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadDoctorsCount();
    loadDepartments();
  }, []);

  const loadDoctorsCount = async () => {
    try {
      const response = await fetch('/api/admin/doctors', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const activeCount = data.doctors.filter((doctor: Doctor) => doctor.is_active).length;
        const totalCount = data.doctors.length;
        setActiveDoctorsCount(activeCount);
        setTotalDoctorsCount(totalCount);
      }
    } catch (error) {
      console.error('Error loading doctors count:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/resources/departments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const searchDoctors = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(`/api/admin/doctors?search=${encodeURIComponent(searchTerm.trim())}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.doctors || []);
        setShowSearchResults(true);
      } else {
        toast({
          title: "Error",
          description: "Failed to search doctors",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error searching doctors:', error);
      toast({
        title: "Error",
        description: "Failed to search doctors",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchDoctors();
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setShowEditDialog(true);
  };

  const handleToggleStatus = async (doctorId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/doctors/${doctorId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        // Update the search results to reflect the change
        setSearchResults(prev =>
          prev.map(doctor =>
            doctor.id === doctorId
              ? { ...doctor, is_active: !currentStatus }
              : doctor
          )
        );

        // Refresh the counts
        loadDoctorsCount();

        toast({
          title: "Success",
          description: `Doctor ${currentStatus ? 'deactivated' : 'activated'} successfully`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update doctor status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error toggling doctor status:', error);
      toast({
        title: "Error",
        description: "Failed to update doctor status",
        variant: "destructive",
      });
    }
  };

  const handleUpdateDoctor = async (data: DoctorFormData) => {
    if (!editingDoctor) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/doctors/${editingDoctor.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Update the search results to reflect the change
        setSearchResults(prev =>
          prev.map(doctor =>
            doctor.id === editingDoctor.id
              ? {
                  ...doctor,
                  name: data.name,
                  department: {
                    id: departments.find(d => d.value === data.department_id)?.value || doctor.department.id,
                    name: departments.find(d => d.value === data.department_id)?.label || doctor.department.name,
                    code: departments.find(d => d.value === data.department_id)?.code || doctor.department.code
                  }
                }
              : doctor
          )
        );

        toast({
          title: "Success",
          description: "Doctor updated successfully",
        });
        setShowEditDialog(false);
        setEditingDoctor(null);
        reset();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to update doctor",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating doctor:', error);
      toast({
        title: "Error",
        description: "Failed to update doctor",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDoctor = async (data: DoctorFormData) => {
    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cnrs_token')}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Doctor added successfully",
        });
        setShowAddDialog(false);
        reset();
        loadDoctorsCount(); // Refresh the count
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to add doctor",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding doctor:', error);
      toast({
        title: "Error",
        description: "Failed to add doctor",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Doctor Management</h1>
        <p className="text-gray-600">Manage doctors and their department assignments</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-full bg-green-100">
              <Users className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Doctors</p>
              <p className="text-2xl font-bold text-green-600">{activeDoctorsCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-full bg-purple-100">
              <User className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Doctors</p>
              <p className="text-2xl font-bold text-purple-600">{totalDoctorsCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Doctor Button */}
      <div className="mb-8">
        <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Doctor
        </Button>
      </div>

      {/* Search Doctors Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search Doctors</CardTitle>
          <CardDescription>
            Search for specific doctors by name or department
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search doctors by name or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={searching || !searchTerm.trim()}>
                {searching ? 'Searching...' : 'Search'}
              </Button>
              {showSearchResults && (
                <Button type="button" variant="outline" onClick={clearSearch}>
                  Clear
                </Button>
              )}
            </div>
          </form>

          {/* Search Results */}
          {showSearchResults && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Search Results ({searchResults.length} found)
              </h3>
              {searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No doctors found matching your search</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {searchResults.map((doctor) => (
                    <Card key={doctor.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{doctor.name}</h3>
                          <p className="text-sm text-gray-600">{doctor.department.name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">
                              Created: {new Date(doctor.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditDoctor(doctor)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={doctor.is_active ? "destructive" : "default"}
                            onClick={() => handleToggleStatus(doctor.id, doctor.is_active)}
                          >
                            {doctor.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>



      {/* Edit Doctor Dialog */}
      {showEditDialog && editingDoctor && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Doctor</DialogTitle>
              <DialogDescription>
                Update the doctor's information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleUpdateDoctor)} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  {...register('name')}
                  defaultValue={editingDoctor.name}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-department">Department</Label>
                <Select
                  defaultValue={editingDoctor.department.id.toString()}
                  onValueChange={(value) => setValue('department_id', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value.toString()}>
                        {dept.label} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department_id && (
                  <p className="text-sm text-red-600 mt-1">{errors.department_id.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingDoctor(null);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Update Doctor'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Doctor Dialog */}
      {showAddDialog && (
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Doctor</DialogTitle>
              <DialogDescription>
                Enter the details for the new doctor
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleAddDoctor)} className="space-y-4">
              <div>
                <Label htmlFor="add-name">Name</Label>
                <Input
                  id="add-name"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="add-department">Department</Label>
                <Select
                  onValueChange={(value) => setValue('department_id', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value.toString()}>
                        {dept.label} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department_id && (
                  <p className="text-sm text-red-600 mt-1">{errors.department_id.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Doctor'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
