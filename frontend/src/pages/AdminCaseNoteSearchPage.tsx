import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Search,
  History,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { requestsApi } from '@/api/requests';
import type { CaseNoteRequest, RequestEvent } from '@/types/requests';

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

export default function AdminCaseNoteSearchPage() {
  const { user, hasRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CaseNoteRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CaseNoteRequest | null>(null);
  const [timeline, setTimeline] = useState<RequestEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setSearching(true);
    setError(null);
    setSelectedRequest(null);
    setTimeline([]);

    try {
      const response = await requestsApi.getRequests({
        page: 1,
        per_page: 50,
        search: searchTerm.trim(),
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      if (response.success) {
        setSearchResults(response.requests.data);
      } else {
        setError('Failed to search case notes');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setError('Failed to search case notes');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectRequest = async (request: CaseNoteRequest) => {
    setSelectedRequest(request);
    setLoading(true);

    try {
      const response = await requestsApi.getRequest(request.id);
      if (response.success) {
        setTimeline(response.timeline || []);
      }
    } catch (error: any) {
      console.error('Error loading request details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Case Note Search</h1>
          <p className="text-gray-600 mt-2">
            Search for specific case notes by patient name or MRN to view detailed information and tracking logs
          </p>
        </div>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Case Notes</span>
          </CardTitle>
          <CardDescription>
            Enter patient name or MRN to find specific case notes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Search by patient name or MRN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching || !searchTerm.trim()}>
              {searching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results ({searchResults.length})</CardTitle>
            <CardDescription>
              Click on a case note to view detailed information and tracking logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchResults.map((request) => (
                <div
                  key={request.id}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedRequest?.id === request.id
                      ? 'bg-purple-50 border-purple-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectRequest(request)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">#{request.request_number}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                        <span className="font-medium">{request.patient?.name}</span>
                        <span>•</span>
                        <span>MRN: {request.patient?.mrn}</span>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                        <span>Requested by: {request.requested_by?.name}</span>
                        <span>•</span>
                        <span>Department: {request.department?.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(request.status)}
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Case Note Details */}
      {selectedRequest && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Case Note Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Case Note Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Request Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Request Number:</span>
                        <span className="font-medium">#{selectedRequest.request_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        {getStatusBadge(selectedRequest.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Priority:</span>
                        <span className="font-medium">{selectedRequest.priority.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">
                          {new Date(selectedRequest.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Patient Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{selectedRequest.patient?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">MRN:</span>
                        <span className="font-medium">{selectedRequest.patient?.mrn}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Request Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Requested by:</span>
                        <span className="font-medium">{selectedRequest.requested_by?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Department:</span>
                        <span className="font-medium">{selectedRequest.department?.name}</span>
                      </div>
                      {selectedRequest.doctor && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Doctor:</span>
                          <span className="font-medium">{selectedRequest.doctor.name}</span>
                        </div>
                      )}
                      {selectedRequest.location && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Location:</span>
                          <span className="font-medium">{selectedRequest.location.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Purpose</h3>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedRequest.purpose}
                    </p>
                  </div>

                  {selectedRequest.remarks && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Remarks</h3>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        {selectedRequest.remarks}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline/Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Case Note Timeline</span>
              </CardTitle>
              <CardDescription>
                Complete tracking history of this case note
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="flex space-x-3">
                      <Skeleton className="h-3 w-3 rounded-full mt-2" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : timeline.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No timeline events found</p>
                </div>
              ) : (
                <>
                  {/* Debug information for timeline */}
                  <div className="mb-4 p-3 bg-gray-100 rounded-lg text-xs">
                    <div className="font-medium mb-2">Timeline Debug Info:</div>
                    <div>User ID: {user?.id}</div>
                    <div>User Roles: {user?.roles?.join(', ') || 'No roles'}</div>
                    <div>Has Role CA: {hasRole('CA') ? 'Yes' : 'No'}</div>
                    <div>Has Role MR_STAFF: {hasRole('MR_STAFF') ? 'Yes' : 'No'}</div>
                    <div>Has Role ADMIN: {hasRole('ADMIN') ? 'Yes' : 'No'}</div>
                    <div>Timeline Events: {timeline.length}</div>
                    <div>Handover Events: {timeline.filter(e => e.type === 'handed_over').length}</div>
                    {timeline.filter(e => e.type === 'handed_over').map((event, index) => (
                      <div key={index} className="mt-2 p-2 bg-white rounded border">
                        <div>Event {index + 1}: {event.type}</div>
                        <div>Metadata Keys: {event.metadata ? Object.keys(event.metadata).join(', ') : 'No metadata'}</div>
                        <div>Handed Over To: {event.metadata?.handed_over_to_user_name || 'Not found'}</div>
                        <div>Reason: {event.metadata?.handover_reason || 'Not found'}</div>
                      </div>
                    ))}
                  </div>
                                 <div className="space-y-4">
                   {timeline.map((event, index) => {
                     // Get event color based on type with enhanced color coding
                     const getEventColor = (type: string) => {
                       switch (type) {
                         // Request-related events (purple)
                         case 'created': return 'bg-purple-500';
                         case 'handover_requested': return 'bg-purple-500';
                         case 'submitted': return 'bg-purple-500';
                         
                         // Approved/Verified events (green)
                         case 'approved': return 'bg-green-500';
                         case 'handover_approved': return 'bg-green-500';
                         case 'handover_verified': return 'bg-green-500';
                         case 'handover_receipt_verified': return 'bg-green-500';
                         case 'returned_verified': return 'bg-green-500';
                         case 'received': return 'bg-green-500';
                         case 'acknowledged': return 'bg-green-500';
                         case 'completed': return 'bg-emerald-500';
                         
                         // Rejected events (red)
                         case 'rejected': return 'bg-red-500';
                         case 'handover_rejected': return 'bg-red-500';
                         case 'rejected_not_received': return 'bg-red-500';
                         case 'returned_rejected': return 'bg-red-500';
                         
                         // Transfer/Handover events (orange)
                         case 'handed_over': return 'bg-orange-500';
                         case 'status_changed': return 'bg-orange-500';
                         
                         // Progress events (purple)
                         case 'in_progress': return 'bg-purple-500';
                         case 'updated': return 'bg-purple-500';
                         
                         // Default
                         default: return 'bg-gray-500';
                       }
                     };

                     return (
                       <div key={event.id} className="flex space-x-3">
                         <div className="flex-shrink-0">
                           <div className={`w-3 h-3 ${getEventColor(event.type)} rounded-full mt-2`}></div>
                           {index < timeline.length - 1 && (
                             <div className="w-0.5 h-12 bg-gray-200 mx-auto mt-1"></div>
                           )}
                         </div>
                         <div className="flex-1 pb-4">
                           <div className="flex items-center space-x-2 mb-1">
                             <span className="font-medium text-gray-900">{event.description}</span>
                             <span className="text-sm text-gray-500">•</span>
                             <span className="text-sm text-gray-500">{event.occurred_at_human}</span>
                           </div>

                           {/* Enhanced metadata display for handover events */}
                           {event.type === 'handed_over' && event.metadata && (
                             <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                               <h4 className="text-sm font-medium text-orange-900 mb-3 flex items-center">
                                 <ArrowUpRight className="h-4 w-4 mr-1" />
                                 Handover Details
                               </h4>
                                                              {/* Full detailed view for ALL users - MR Staff and Admin need complete information */}
                               <div className="space-y-3">
                                 {/* Transfer Information */}
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                   {event.metadata.handed_over_from_user_name && (
                                     <div className="bg-white rounded-lg p-2 border border-orange-100">
                                       <span className="text-xs text-gray-600 block">From:</span>
                                       <p className="font-medium text-gray-900 text-sm">{event.metadata.handed_over_from_user_name}</p>
                                       </div>
                                   )}
                                   {event.metadata.handed_over_to_user_name && (
                                     <div className="bg-white rounded-lg p-2 border border-orange-100">
                                       <span className="text-xs text-gray-600 block">To:</span>
                                       <p className="font-medium text-gray-900 text-sm">{event.metadata.handed_over_to_user_name}</p>
                                       </div>
                                   )}
                                 </div>

                                 {/* Location Information */}
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                   {event.metadata.department_name && (
                                     <div className="bg-white rounded-lg p-2 border border-orange-100">
                                       <span className="text-xs text-gray-600 block">Department:</span>
                                       <p className="font-medium text-gray-900 text-sm">{event.metadata.department_name}</p>
                                     </div>
                                   )}
                                   {event.metadata.location_name && (
                                     <div className="bg-white rounded-lg p-2 border border-orange-100">
                                       <span className="text-xs text-gray-600 block">Location:</span>
                                       <p className="font-medium text-gray-900 text-sm">{event.metadata.location_name}</p>
                                     </div>
                                   )}
                                 </div>

                                 {/* Handover Reason */}
                                 {event.metadata.handover_reason && (
                                   <div className="bg-white rounded-lg p-2 border border-orange-100">
                                     <span className="text-xs text-gray-600 block">Handover Reason:</span>
                                     <p className="font-medium text-gray-900 text-sm">{event.metadata.handover_reason}</p>
                                   </div>
                                 )}

                                 {/* Additional Notes */}
                                 {event.metadata.additional_notes && (
                                   <div className="bg-white rounded-lg p-2 border border-orange-100">
                                     <span className="text-xs text-gray-600 block">Additional Notes:</span>
                                     <p className="font-medium text-gray-900 text-sm">{event.metadata.additional_notes}</p>
                                   </div>
                                 )}

                                 {/* Status */}
                                 {event.metadata.handover_status && (
                                   <div className="bg-white rounded-lg p-2 border border-orange-100">
                                     <span className="text-xs text-gray-600 block">Status:</span>
                                     <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                       event.metadata.handover_status === 'pending'
                                         ? 'bg-yellow-100 text-yellow-800'
                                         : 'bg-green-100 text-green-800'
                                     }`}>
                                       {event.metadata.handover_status.charAt(0).toUpperCase() + event.metadata.handover_status.slice(1)}
                                     </span>
                                   </div>
                                 )}
                               </div>
                             </div>
                           )}

                           {/* Enhanced metadata display with color-coded borders */}
                           {event.metadata && Object.keys(event.metadata).length > 0 && (
                             <div className={`mt-2 p-3 rounded-lg border-2 ${
                               event.type.includes('rejected') || event.type.includes('rejected_not_received') || event.type.includes('returned_rejected')
                                 ? 'bg-red-50 border-red-200'
                                 : event.type.includes('approved') || event.type.includes('verified') || event.type.includes('received') || event.type.includes('completed')
                                 ? 'bg-green-50 border-green-200'
                                 : event.type.includes('requested') || event.type.includes('created') || event.type.includes('submitted')
                                 ? 'bg-purple-50 border-purple-200'
                                 : 'bg-gray-50 border-gray-200'
                             }`}>
                               <div className="space-y-2">
                                 {/* Comments and Notes with color-coded borders */}
                                 {(event.metadata.notes || event.metadata.reason || event.metadata.verification_notes ||
                                   event.metadata.completion_notes || event.metadata.approval_remarks ||
                                   event.metadata.rejection_reason || event.metadata.handover_reason) && (
                                   <div className={`bg-white p-2 rounded border-l-4 ${
                                     event.type.includes('rejected') || event.type.includes('rejected_not_received') || event.type.includes('returned_rejected')
                                       ? 'border-red-400'
                                       : event.type.includes('approved') || event.type.includes('verified') || event.type.includes('received') || event.type.includes('completed')
                                       ? 'border-green-400'
                                       : event.type.includes('requested') || event.type.includes('created') || event.type.includes('submitted')
                                       ? 'border-purple-400'
                                       : 'border-purple-400'
                                   }`}>
                                     <span className="text-xs font-medium text-gray-600 block mb-1">Comments:</span>
                                     <p className="text-sm text-gray-700">
                                       {event.metadata.notes || event.metadata.reason || event.metadata.verification_notes ||
                                        event.metadata.completion_notes || event.metadata.approval_remarks ||
                                        event.metadata.rejection_reason || event.metadata.handover_reason}
                                     </p>
                                   </div>
                                 )}

                                 {/* Doctor Information */}
                                 {(event.metadata.doctor_name || event.metadata.handover_doctor_name || event.metadata.new_doctor_name) && (
                                   <div className="bg-white p-2 rounded border-l-2 border-green-300">
                                     <span className="text-xs font-medium text-gray-600 block mb-1">Doctor:</span>
                                     <p className="text-sm text-gray-700">
                                       {event.metadata.doctor_name || event.metadata.handover_doctor_name || event.metadata.new_doctor_name}
                                     </p>
                                   </div>
                                 )}

                                 {/* Department Information */}
                                 {(event.metadata.department_name || event.metadata.new_department_name) && (
                                   <div className="bg-white p-2 rounded border-l-2 border-purple-300">
                                     <span className="text-xs font-medium text-gray-600 block mb-1">Department:</span>
                                     <p className="text-sm text-gray-700">
                                       {event.metadata.department_name || event.metadata.new_department_name}
                                     </p>
                                   </div>
                                 )}

                                 {/* Location Information */}
                                 {event.metadata.location_name && event.metadata.location_name !== 'No specific location' && (
                                   <div className="bg-white p-2 rounded border-l-2 border-orange-300">
                                     <span className="text-xs font-medium text-gray-600 block mb-1">Location:</span>
                                     <p className="text-sm text-gray-700">{event.metadata.location_name}</p>
                                   </div>
                                 )}

                                 {/* Transfer Information */}
                                 {(event.metadata.from_user || event.metadata.to_user ||
                                   event.metadata.handed_over_from_user_name || event.metadata.handed_over_to_user_name) && (
                                   <div className="bg-white p-2 rounded border-l-2 border-indigo-300">
                                     <span className="text-xs font-medium text-gray-600 block mb-1">Transfer:</span>
                                     <p className="text-sm text-gray-700">
                                       {event.metadata.from_user || event.metadata.handed_over_from_user_name} → {event.metadata.to_user || event.metadata.handed_over_to_user_name}
                                     </p>
                                   </div>
                                 )}

                                 {/* Status Changes */}
                                 {(event.metadata.old_status || event.metadata.new_status) && (
                                   <div className="bg-white p-2 rounded border-l-2 border-yellow-300">
                                     <span className="text-xs font-medium text-gray-600 block mb-1">Status Change:</span>
                                     <p className="text-sm text-gray-700">
                                       {event.metadata.old_status} → {event.metadata.new_status}
                                     </p>
                                   </div>
                                 )}
                               </div>
                             </div>
                           )}
                         </div>
                       </div>
                     );
                   })}
                 </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Results Message */}
      {searchTerm && !searching && searchResults.length === 0 && !error && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No case notes found</p>
            <p className="text-sm text-gray-400">
              Try searching with a different patient name or MRN
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleSearch}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
