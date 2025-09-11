import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  FileText,
  Trash2,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { requestsApi, resourcesApi } from '@/api/requests';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CreateIndividualRequestForm } from '@/components/forms/CreateIndividualRequestForm';

interface IndividualRequest {
  id: number;
  request_number: string;
  status: string;
  priority: string;
  purpose: string;
  needed_date: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  patient: {
    id: number;
    name: string;
    mrn: string;
    nationality_id?: string;
  };
  department: {
    id: number;
    name: string;
    code: string;
  };
  doctor?: {
    id: number;
    name: string;
  };
  location?: {
    id: number;
    name: string;
    type: string;
  };
  status_label: string;
  priority_label: string;
  is_overdue: boolean;
  can_be_approved: boolean;
  can_be_completed: boolean;
}

export default function IndividualRequestsPage() {
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<IndividualRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    if (!hasRole('CA')) {
      toast({
        title: 'Access Denied',
        description: 'Only Clinic Assistants can access this page.',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    loadRequests();
    loadDepartments();
  }, [hasRole, navigate, toast]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await requestsApi.getIndividualRequests({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        department_id: departmentFilter !== 'all' ? parseInt(departmentFilter) : undefined,
      });

      if (response && response.success) {
        // Handle paginated response - extract the data array
        const requestsData = response.data?.data || response.data || [];
        setRequests(requestsData);
      } else {
        setError(response.message || 'Failed to load requests');
      }
    } catch (error: any) {
      console.error('Error loading individual requests:', error);
      setError(error instanceof Error ? error.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };



  const loadDepartments = async () => {
    try {
      const response = await resourcesApi.getDepartments();
      if (response && response.success) {
        setDepartments(response.departments || []);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleDeleteRequest = async (requestId: number) => {
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await requestsApi.deleteIndividualRequest(requestId);
      if (response && response.success) {
        toast({
          title: 'Success',
          description: 'Request deleted successfully',
          variant: 'default',
        });
        loadRequests();
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to delete request',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete request',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary', icon: Clock },
      approved: { variant: 'default', icon: CheckCircle },
      rejected: { variant: 'destructive', icon: XCircle },
      in_progress: { variant: 'default', icon: FileText },
      completed: { variant: 'default', icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { variant: 'secondary', className: 'bg-gray-100 text-gray-800' },
      normal: { variant: 'default', className: 'bg-blue-100 text-blue-800' },
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (showCreateForm) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Link to="/individual-requests">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Requests
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Create Individual Case Note Request</h1>
            <p className="text-gray-600 mt-2">
              Create a new case note request for a specific patient
            </p>
          </div>
        </div>

        <CreateIndividualRequestForm
          onSuccess={() => {
            setShowCreateForm(false);
            loadRequests();
            toast({
              title: 'Success',
              description: 'Case note request created successfully',
              variant: 'default',
            });
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">

          </div>
          <h1 className="text-3xl font-bold text-gray-900">Request Case Notes</h1>
          <p className="text-gray-600 mt-2">
            Create and manage individual case note requests
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Request
        </Button>
      </div>



      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by patient name or MRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && loadRequests()}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value.toString()}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={loadRequests} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Apply Filters
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setDepartmentFilter('all');
                loadRequests();
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

            {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Case Note Requests</CardTitle>
          <CardDescription>
            Showing {requests.length} request{requests.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || departmentFilter !== 'all'
                  ? 'No requests match your current filters. Try adjusting your search criteria.'
                  : 'You haven\'t created any case note requests yet.'}
              </p>
              {!searchTerm && statusFilter === 'all' && priorityFilter === 'all' && departmentFilter === 'all' && (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Request
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Patient Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">MRN</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Department</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Priority</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formatDate(request.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{request.patient.name}</p>
                          <p className="text-sm text-gray-500">#{request.request_number}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{request.patient.mrn}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{request.department.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="py-3 px-4">
                        {getPriorityBadge(request.priority)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          {request.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRequest(request.id)}
                              className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
