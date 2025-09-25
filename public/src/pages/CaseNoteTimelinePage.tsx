import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { requestsApi } from '@/api/requests';
import {
  Search,
  FileText,
  User,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Eye,
  Loader2
} from 'lucide-react';

interface CaseNote {
  id: number;
  request_number: string;
  status: string;
  priority: string;
  purpose: string;
  created_at: string;
  needed_date: string;
  patient: {
    id: number;
    name: string;
    mrn: string;
    nationality_id: string;
  };
  department: {
    name: string;
  };
  doctor?: {
    name: string;
  };
  location?: {
    name: string;
  };
  requested_by: {
    id: number;
    name: string;
    email: string;
  };
  approved_by?: {
    name: string;
  };
  approved_at?: string;
  rejected_by?: {
    name: string;
  };
  rejected_at?: string;
  rejection_reason?: string;
  is_received?: boolean;
  received_at?: string;
  received_by?: {
    name: string;
  };
  handover_status?: string;
  current_pic_user_id?: number;
  current_pic_user?: {
    name: string;
  };
}

interface TimelineEvent {
  id: number;
  event_type: string;
  description: string;
  created_at: string;
  user: {
    id: number;
    name: string;
    role: string;
  };
  metadata?: {
    [key: string]: any;
  };
}

const CaseNoteTimelinePage: React.FC = () => {
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CaseNote[]>([]);
  const [selectedCaseNote, setSelectedCaseNote] = useState<CaseNote | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Check permissions
  useEffect(() => {
    if (!hasRole('MR_STAFF')) {
      toast({
        title: 'Access Denied',
        description: 'Only Medical Records Staff can access this page.',
        variant: 'destructive',
      });
      return;
    }
  }, [hasRole, toast]);

  // Search case notes
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await requestsApi.searchCaseNotes(searchQuery);

      if (response.success) {
        const responseData = response as any;
        setSearchResults(responseData.case_notes || []);
      } else {
        toast({
          title: 'Search Error',
          description: response.message || 'Failed to search case notes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error searching case notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to search case notes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load timeline events for a case note
  const loadTimelineEvents = async (caseNoteId: number) => {
    try {
      setLoadingTimeline(true);
      const response = await requestsApi.getCaseNoteTimeline(caseNoteId);

      if (response.success) {
        const responseData = response as any;
        const events = responseData.events || [];

        // Debug logging to help identify the issue
        console.log('Timeline events received:', {
          caseNoteId,
          eventsCount: events.length,
          events: events.map((event: any) => ({
            id: event.id,
            event_type: event.event_type,
            description: event.description,
            user: event.user?.name,
            metadata: event.metadata
          }))
        });

        setTimelineEvents(events);
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to load timeline events',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading timeline events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load timeline events',
        variant: 'destructive',
      });
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Handle case note selection
  const handleCaseNoteSelection = async (caseNote: CaseNote) => {
    // Clear previous timeline before loading new one
    setTimelineEvents([]);
    setSelectedCaseNote(caseNote);

    console.log('Loading timeline for case note:', {
      id: caseNote.id,
      requestNumber: caseNote.request_number,
      patientName: caseNote.patient.name
    });

    await loadTimelineEvents(caseNote.id);
  };

  // Get priority badge with proper styling
  const getPriorityBadge = (priority: string) => {
    const config = {
      low: {
        variant: 'outline' as const,
        className: 'border-gray-300 text-gray-700 bg-gray-50 text-xs'
      },
      normal: {
        variant: 'outline' as const,
        className: 'border-purple-300 text-purple-700 bg-purple-50 text-xs'
      },
      high: {
        variant: 'outline' as const,
        className: 'border-orange-300 text-orange-700 bg-orange-50 text-xs'
      },
      urgent: {
        variant: 'outline' as const,
        className: 'border-red-300 text-red-700 bg-red-50 text-xs'
      },
    };

    const configItem = config[priority.toLowerCase() as keyof typeof config] || config.normal;

    return (
      <Badge variant={configItem.variant} className={configItem.className}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  // Get status badge with proper styling
  const getStatusBadge = (status: string) => {
    const config = {
      'pending': {
        variant: 'outline' as const,
        className: 'border-yellow-300 text-yellow-700 bg-yellow-50 text-xs'
      },
      'approved': {
        variant: 'outline' as const,
        className: 'border-green-300 text-green-700 bg-green-50 text-xs'
      },
      'rejected': {
        variant: 'outline' as const,
        className: 'border-red-300 text-red-700 bg-red-50 text-xs'
      },
      'completed': {
        variant: 'outline' as const,
        className: 'border-emerald-300 text-emerald-700 bg-emerald-50 text-xs'
      },
    };

    const configItem = config[status.toLowerCase() as keyof typeof config] || config.pending;

    return (
      <Badge variant={configItem.variant} className={configItem.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Get timeline event icon
  const getTimelineEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created': return <FileText className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'handover_requested': return <ArrowRight className="h-4 w-4" />;
      case 'handover_approved': return <CheckCircle className="h-4 w-4" />;
      case 'handover_rejected': return <XCircle className="h-4 w-4" />;
      case 'handed_over': return <ArrowRight className="h-4 w-4" />;
      case 'acknowledged': return <Package className="h-4 w-4" />;
      case 'received': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'updated': return <AlertTriangle className="h-4 w-4" />;
      case 'status_changed': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Get timeline event color with enhanced color coding
  const getTimelineEventColor = (eventType: string) => {
    switch (eventType) {
      // Request-related events (purple)
      case 'created': return 'text-purple-600 bg-purple-100';
      case 'handover_requested': return 'text-purple-600 bg-purple-100';
      case 'submitted': return 'text-purple-600 bg-purple-100';
      
      // Approved/Verified events (green)
      case 'approved': return 'text-green-600 bg-green-100';
      case 'handover_approved': return 'text-green-600 bg-green-100';
      case 'handover_verified': return 'text-green-600 bg-green-100';
      case 'handover_receipt_verified': return 'text-green-600 bg-green-100';
      case 'returned_verified': return 'text-green-600 bg-green-100';
      case 'received': return 'text-green-600 bg-green-100';
      case 'acknowledged': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-emerald-600 bg-emerald-100';
      
      // Rejected events (red)
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'handover_rejected': return 'text-red-600 bg-red-100';
      case 'rejected_not_received': return 'text-red-600 bg-red-100';
      case 'returned_rejected': return 'text-red-600 bg-red-100';
      
      // Transfer/Handover events (orange)
      case 'handed_over': return 'text-orange-600 bg-orange-100';
      case 'status_changed': return 'text-orange-600 bg-orange-100';
      
      // Progress events (purple)
      case 'in_progress': return 'text-purple-600 bg-purple-100';
      case 'updated': return 'text-purple-600 bg-purple-100';
      
      // Default
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!hasRole('MR_STAFF')) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4">
            <User className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only Medical Records Staff can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Case Note Timeline</h1>
          <p className="text-gray-600 mt-1">
            Search and track the complete journey of case notes
          </p>
        </div>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Case Notes
          </CardTitle>
          <CardDescription>
            Search by patient name, MRN, or nationality ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter patient name, MRN, or nationality ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Results */}
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              {searchResults.length} case note(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Case Notes Found</h3>
                <p>Try searching with different criteria</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((caseNote) => (
                  <div
                    key={caseNote.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedCaseNote?.id === caseNote.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleCaseNoteSelection(caseNote)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{caseNote.patient.name}</h4>
                      <div className="flex gap-2">
                        {getPriorityBadge(caseNote.priority)}
                        {getStatusBadge(caseNote.status)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>MRN: {caseNote.patient.mrn}</div>
                      <div>Nationality ID: {caseNote.patient.nationality_id}</div>
                      <div>Request: {caseNote.request_number}</div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(caseNote.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center text-xs">
                          <User className="h-3 w-3 mr-1" />
                          {caseNote.requested_by.name}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Case Note Details & Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Case Note Details & Timeline</CardTitle>
            <CardDescription>
              {selectedCaseNote ? `Tracking: ${selectedCaseNote.patient.name}` : 'Select a case note to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedCaseNote ? (
              <div className="text-center py-8 text-gray-500">
                <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Case Note Selected</h3>
                <p>Select a case note from the search results to view details and timeline</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Case Note Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Case Note Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Patient:</span>
                      <p className="text-gray-900">{selectedCaseNote.patient.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">MRN:</span>
                      <p className="text-gray-900">{selectedCaseNote.patient.mrn}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Nationality ID:</span>
                      <p className="text-gray-900">{selectedCaseNote.patient.nationality_id}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Request Number:</span>
                      <p className="text-gray-900">{selectedCaseNote.request_number}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      {getStatusBadge(selectedCaseNote.status)}
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Priority:</span>
                      {getPriorityBadge(selectedCaseNote.priority)}
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Department:</span>
                      <p className="text-gray-900">{selectedCaseNote.department.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Purpose:</span>
                      <p className="text-gray-900">{selectedCaseNote.purpose}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Requested By:</span>
                      <p className="text-gray-900">{selectedCaseNote.requested_by.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Created:</span>
                      <p className="text-gray-900">{new Date(selectedCaseNote.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Timeline</h3>
                  {loadingTimeline ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : timelineEvents.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>No timeline events found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {timelineEvents.map((event) => (
                        <div key={event.id} className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${getTimelineEventColor(event.event_type)}`}>
                            {getTimelineEventIcon(event.event_type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-gray-900">{event.description}</p>
                              <span className="text-xs text-gray-500">
                                {new Date(event.created_at).toLocaleString()}
                              </span>
                            </div>
                            {/* Only show user info if it's not "Unknown" */}
                            {event.user.name !== 'Unknown' && (
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <span>{event.user.name}</span>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">
                                  {event.user.role}
                                </Badge>
                              </div>
                            )}
                            {/* Enhanced metadata display with color-coded borders */}
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                              <div className={`mt-2 p-3 rounded-lg border-2 ${
                                event.event_type.includes('rejected') || event.event_type.includes('rejected_not_received') || event.event_type.includes('returned_rejected')
                                  ? 'bg-red-50 border-red-200'
                                  : event.event_type.includes('approved') || event.event_type.includes('verified') || event.event_type.includes('received') || event.event_type.includes('completed')
                                  ? 'bg-green-50 border-green-200'
                                  : event.event_type.includes('requested') || event.event_type.includes('created') || event.event_type.includes('submitted')
                                  ? 'bg-purple-50 border-purple-200'
                                  : 'bg-gray-50 border-gray-200'
                              }`}>
                                <div className="space-y-2">
                                  {/* Comments and Notes with color-coded borders */}
                                  {(event.metadata.notes || event.metadata.reason || event.metadata.verification_notes || 
                                    event.metadata.completion_notes || event.metadata.approval_remarks || 
                                    event.metadata.rejection_reason || event.metadata.handover_reason) && (
                                    <div className={`bg-white p-2 rounded border-l-4 ${
                                      event.event_type.includes('rejected') || event.event_type.includes('rejected_not_received') || event.event_type.includes('returned_rejected')
                                        ? 'border-red-400'
                                        : event.event_type.includes('approved') || event.event_type.includes('verified') || event.event_type.includes('received') || event.event_type.includes('completed')
                                        ? 'border-green-400'
                                        : event.event_type.includes('requested') || event.event_type.includes('created') || event.event_type.includes('submitted')
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
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CaseNoteTimelinePage;
