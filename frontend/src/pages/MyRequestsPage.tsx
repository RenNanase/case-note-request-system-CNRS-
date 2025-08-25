import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  ArrowUpRight,
  Search,
  Filter,
  Calendar,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { requestsApi } from '@/api/requests';
import type { CaseNoteRequest } from '@/types/requests';

// Status badge component
const getStatusBadge = (status: string) => {
  const statusColors = {
    'pending': { icon: Clock, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'approved': { icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-200' },
    'in_progress': { icon: Clock, className: 'bg-purple-100 text-purple-800 border-purple-200' },
    'completed': { icon: CheckCircle, className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    'rejected': { icon: AlertTriangle, className: 'bg-red-100 text-red-800 border-red-200' }
  };

  const config = statusColors[status as keyof typeof statusColors] || statusColors.pending;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`flex items-center space-x-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      <span>{status.replace('_', ' ').toUpperCase()}</span>
    </Badge>
  );
};

// Involvement type badge
const getInvolvementBadge = (requestedBy: number, currentPIC: number, userId: number) => {
  if (requestedBy === userId && currentPIC === userId) {
    return (
      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
        <FileText className="h-3 w-3 mr-1" />
        Created & Assigned
      </Badge>
    );
  } else if (requestedBy === userId && currentPIC !== userId) {
    return (
      <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
        <ArrowUpRight className="h-3 w-3 mr-1" />
        Handed Over
      </Badge>
    );
  } else if (requestedBy !== userId && currentPIC === userId) {
    return (
      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
        <Users className="h-3 w-3 mr-1" />
        Assigned to Me
      </Badge>
    );
  } else {
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
        <User className="h-3 w-3 mr-1" />
        Previously Involved
      </Badge>
    );
  }
};

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CaseNoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [involvementFilter, setInvolvementFilter] = useState<string>('all');

  useEffect(() => {
    const loadRequests = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        // Get all requests where user is involved (both created and assigned)
        const response = await requestsApi.getRequests({
          page: 1,
          per_page: 1000, // Get all requests for this user
          sort_by: 'created_at',
          sort_order: 'desc',
          include_all_involvement: true // This will return all requests where user is involved
        });

        if (response.success) {
          setRequests(response.requests.data);
        } else {
          setError('Failed to load requests');
        }
      } catch (error: any) {
        console.error('Error loading requests:', error);
        setError('Failed to load requests');
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, [user]);

  // Filter requests based on search and filters
  const filteredRequests = requests.filter(request => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      request.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.patient?.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.request_number?.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

    // Involvement filter
    const isCreator = request.requested_by_user_id === user?.id;
    const isCurrentPIC = request.current_pic_user_id === user?.id;

    let matchesInvolvement = true;
    if (involvementFilter === 'created') {
      matchesInvolvement = isCreator;
    } else if (involvementFilter === 'assigned') {
      matchesInvolvement = isCurrentPIC && !isCreator;
    } else if (involvementFilter === 'handed_over') {
      matchesInvolvement = isCreator && !isCurrentPIC;
    } else if (involvementFilter === 'current') {
      matchesInvolvement = isCurrentPIC;
    }

    return matchesSearch && matchesStatus && matchesInvolvement;
  });

  // Get stats for the filtered requests
  const stats = {
    total: filteredRequests.length,
    created: filteredRequests.filter(r => r.requested_by_user_id === user?.id).length,
    assigned: filteredRequests.filter(r => r.current_pic_user_id === user?.id && r.requested_by_user_id !== user?.id).length,
    handedOver: filteredRequests.filter(r => r.requested_by_user_id === user?.id && r.current_pic_user_id !== user?.id).length,
    current: filteredRequests.filter(r => r.current_pic_user_id === user?.id).length,
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Skeleton className="h-4 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">My Case Note Requests</h1>
          <p className="text-gray-600 mt-2">
            Track all case notes you've been involved with - created, assigned, or handed over
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Created</p>
                <p className="text-2xl font-bold text-green-600">{stats.created}</p>
              </div>
              <FileText className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Assigned to Me</p>
                <p className="text-2xl font-bold text-purple-600">{stats.assigned}</p>
              </div>
              <Users className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Handed Over</p>
                <p className="text-2xl font-bold text-orange-600">{stats.handedOver}</p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Currently Mine</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.current}</p>
              </div>
              <User className="h-8 w-8 text-indigo-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by patient name, MRN, or request number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Involvement</label>
              <Select value={involvementFilter} onValueChange={setInvolvementFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All involvement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Involvement</SelectItem>
                  <SelectItem value="created">Created by Me</SelectItem>
                  <SelectItem value="assigned">Assigned to Me</SelectItem>
                  <SelectItem value="handed_over">Handed Over by Me</SelectItem>
                  <SelectItem value="current">Currently Mine</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Case Note Requests</CardTitle>
          <CardDescription>
            Showing {filteredRequests.length} of {requests.length} requests
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
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No case note requests found</p>
              <Link to="/requests/new">
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Create New Request
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Patient Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">MRN</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Involvement</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{request.patient?.name || 'N/A'}</p>
                          <p className="text-sm text-gray-500">#{request.request_number}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{request.patient?.mrn || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="py-3 px-4">
                        {getInvolvementBadge(
                          request.requested_by_user_id,
                          request.current_pic_user_id || 0,
                          user?.id || 0
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Link to={`/requests/${request.id}`}>
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
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
