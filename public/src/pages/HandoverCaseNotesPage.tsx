import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { requestsApi, resourcesApi } from '@/api/requests';
import type { Department, Location } from '@/types/requests';
import {
  ArrowRightLeft,
  Search,
  FileText,
  User,
  Loader2,
  Calendar,
  Clock
} from 'lucide-react';

interface CaseNote {
  id: number;
  request_number: string;
  patient: {
    id: number;
    name: string;
    mrn: string;
    nationality_id?: string;
  };
  batch_id?: number;
  batch_number?: string;
  status: string;
  priority: string;
  purpose: string;
  created_at: string;
  needed_date: string;
  department?: {
    name: string;
  };
  doctor?: {
    name: string;
  };
  current_pic?: {
    name: string;
  };
  is_received?: boolean; // Added is_received to the interface
  handover_status?: string; // Added handover_status to the interface
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface HandoverData {
  case_note_id: number;
  handover_to_user_id: number;
  handover_to_department_id: number;
  handover_to_location_id?: number;
  handover_reason: string;
}

const HandoverCaseNotesPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [caseNotes, setCaseNotes] = useState<CaseNote[]>([]);
  const [filteredCaseNotes, setFilteredCaseNotes] = useState<CaseNote[]>([]);
  const [selectedCaseNote, setSelectedCaseNote] = useState<CaseNote | null>(null);

  // Handover form data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [clinicAssistants, setClinicAssistants] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [handoverData, setHandoverData] = useState<Partial<HandoverData>>({});

  // Check permissions
  useEffect(() => {
    if (!hasRole('CA')) {
      toast({
        title: 'Access Denied',
        description: 'Only Clinic Assistants can access this page.',
        variant: 'destructive',
      });
      return;
    }

  }, [hasRole, toast]);

    // Load case notes assigned to current CA
  const loadCaseNotes = async () => {
    try {
      setLoading(true);

      const response = await requestsApi.getMyRequests();
      let allCaseNotes: any[] = [];

      if (response.success) {
        // Extract case notes from response
        const responseAny = response as any;

        if (responseAny.requests?.data && Array.isArray(responseAny.requests.data)) {
          allCaseNotes = responseAny.requests.data;
        } else if (responseAny.requests && Array.isArray(responseAny.requests)) {
          allCaseNotes = responseAny.requests;
        } else if (responseAny.data?.requests && Array.isArray(responseAny.data.requests)) {
          allCaseNotes = responseAny.data.requests;
        } else if (responseAny.data && Array.isArray(responseAny.data)) {
          allCaseNotes = responseAny.data;
        } else {
          console.error('Unexpected response structure:', responseAny);
          allCaseNotes = [];
        }
      }

      // Filter case notes to only show those that can be handed over
      const handoverableCaseNotes = allCaseNotes.filter(caseNote =>
        caseNote.status === 'approved' && caseNote.is_received === true
      );

      setCaseNotes(handoverableCaseNotes);
      setFilteredCaseNotes(handoverableCaseNotes);

    } catch (error) {
      console.error('Error loading case notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load case notes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load form resources
  const loadResources = async () => {
    try {
      const [deptResponse, usersResponse, locResponse] = await Promise.all([
        resourcesApi.getDepartments(),
        requestsApi.getUsers('CA'),
        resourcesApi.getLocations()
      ]);

                  if (deptResponse.success) {
        setDepartments(deptResponse.departments || []);
      }

      if (usersResponse.success) {
        // Filter out current user from clinic assistants list
        const otherCAs = usersResponse.data?.users?.filter((u: User) => u.id !== user?.id) || [];
        setClinicAssistants(otherCAs);
      }

      if (locResponse.success) {
        setLocations(locResponse.locations || []);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  useEffect(() => {
    if (hasRole('CA')) {
      loadCaseNotes();
      loadResources();
    }
  }, [hasRole]);

  // Filter case notes based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCaseNotes(caseNotes);
    } else {
      const filtered = caseNotes.filter(caseNote =>
        (caseNote.patient?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (caseNote.patient?.mrn?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (caseNote.request_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (caseNote.batch_number?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
      setFilteredCaseNotes(filtered);
    }
  }, [searchTerm, caseNotes]);

  // Filter case notes that can be handed over
  const handoverableCaseNotes = caseNotes.filter(caseNote =>
    caseNote.status === 'approved' &&
    caseNote.is_received === true &&
    caseNote.handover_status !== 'pending_acknowledgement' &&
    caseNote.handover_status !== 'acknowledged'
  );

  // Handle case note selection
  const handleSelectCaseNote = (caseNote: CaseNote) => {
    try {
      // Validate case note data before setting
      if (!caseNote || !caseNote.id || !caseNote.patient) {
        console.error('Invalid case note data:', caseNote);
        toast({
          title: 'Error',
          description: 'Invalid case note data. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      setSelectedCaseNote(caseNote);
      setHandoverData({
        case_note_id: caseNote.id,
        handover_to_user_id: undefined,
        handover_to_department_id: undefined,
        handover_to_location_id: undefined,
        handover_reason: ''
      });
    } catch (error) {
      console.error('Error selecting case note:', error);
      toast({
        title: 'Error',
        description: 'Failed to select case note. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle handover submission
  const handleSubmitHandover = async () => {
    if (!selectedCaseNote || !handoverData.handover_to_user_id || !handoverData.handover_to_department_id) {
      toast({
        title: 'Incomplete Information',
        description: 'Please select a case note, recipient CA, and department.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      const response = await requestsApi.handoverRequest(selectedCaseNote.id, {
        handover_to_user_id: handoverData.handover_to_user_id!,
        handover_to_department_id: handoverData.handover_to_department_id!,
        handover_to_location_id: handoverData.handover_to_location_id,
        handover_reason: handoverData.handover_reason || ''
      });

      if (response.success) {
        const recipientName = clinicAssistants.find(ca => ca.id === handoverData.handover_to_user_id)?.name;

        toast({
          title: 'Handover Successful',
          description: `Case note successfully handed over to ${recipientName}`,
          variant: 'default',
        });

        // Reset selection and reload case notes
        setSelectedCaseNote(null);
        setHandoverData({});
        await loadCaseNotes();
      } else {
        toast({
          title: 'Handover Failed',
          description: response.message || 'Failed to handover case note',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error handing over case note:', error);
      toast({
        title: 'Error',
        description: 'Failed to handover case note. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
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
      'approved': {
        variant: 'outline' as const,
        className: 'border-green-300 text-green-700 bg-green-50 text-xs'
      },
      'assigned': {
        variant: 'outline' as const,
        className: 'border-purple-300 text-purple-700 bg-purple-50 text-xs'
      },
      'in-progress': {
        variant: 'outline' as const,
        className: 'border-yellow-300 text-yellow-700 bg-yellow-50 text-xs'
      },
      'pending': {
        variant: 'outline' as const,
        className: 'border-gray-300 text-gray-700 bg-gray-50 text-xs'
      },
    };

    const configItem = config[status.toLowerCase() as keyof typeof config] || config.pending;

    return (
      <Badge variant={configItem.variant} className={configItem.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Show loading state while checking permissions
  if (loading && caseNotes.length === 0) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Loading handover case notes...</p>
        </div>
      </div>
    );
  }

  // Show access denied message instead of returning null
  if (!hasRole('CA')) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4">
            <User className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only Clinic Assistants can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Handover Case Notes</h1>
          <p className="text-gray-600 mt-1">
            Transfer case notes to other Clinic Assistants
          </p>
        </div>

      </div>



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Case Notes List */}
        <Card>
          <CardHeader>
            <CardTitle>
              <FileText className="h-5 w-5 inline mr-2" />
              My Case Notes ({filteredCaseNotes.length})
            </CardTitle>
            <CardDescription>
              Select a case note to handover to another CA
              {caseNotes.length > 0 && (
                <span className="block mt-1 text-sm text-purple-600">
                  Total available: {caseNotes.length} • Filtered: {filteredCaseNotes.length}
                </span>
              )}
            </CardDescription>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, MRN, or request number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mr-3" />
                <span>Loading case notes...</span>
              </div>
            ) : handoverableCaseNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Case Notes Available for Handover</h3>
                <p>Only approved and received case notes that haven't been handed over can be selected.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {handoverableCaseNotes.map((caseNote) => (
                  <div
                    key={caseNote.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCaseNote?.id === caseNote.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      handleSelectCaseNote(caseNote);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{caseNote.patient?.name || 'Unknown Patient'}</h4>
                      <div className="flex gap-1">
                        {getPriorityBadge(caseNote.priority)}
                        {getStatusBadge(caseNote.status)}
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <div>MRN: {caseNote.patient?.mrn || 'N/A'}</div>
                      <div>Request: {caseNote.request_number}</div>
                      {caseNote.batch_number && (
                        <div>Batch: {caseNote.batch_number}</div>
                      )}
                      <div>Department: {caseNote.department?.name || 'N/A'}</div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {caseNote.needed_date ? new Date(caseNote.needed_date).toLocaleDateString() : 'N/A'}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {caseNote.created_at ? new Date(caseNote.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Handover Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              <ArrowRightLeft className="h-5 w-5 inline mr-2" />
              Handover Details
            </CardTitle>
            <CardDescription>
              {selectedCaseNote ?
                `Handover case note for ${selectedCaseNote.patient.name}` :
                'Select a case note to begin handover process'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!selectedCaseNote ? (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Case Note Selected</h3>
                <p>Please select a case note from the list to start the handover process.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected Case Note Summary */}
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-900 mb-2">Selected Case Note</h4>
                  <div className="text-sm text-purple-800">
                    <div><strong>Patient:</strong> {selectedCaseNote?.patient?.name || 'N/A'}</div>
                    <div><strong>MRN:</strong> {selectedCaseNote?.patient?.mrn || 'N/A'}</div>
                    <div><strong>Request:</strong> {selectedCaseNote?.request_number || 'N/A'}</div>
                    <div><strong>Purpose:</strong> {selectedCaseNote?.purpose || 'N/A'}</div>
                  </div>
                </div>

                {/* Handover Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="handover-to-ca">Handover To (Clinic Assistant) *</Label>
                    <Select
                      value={handoverData.handover_to_user_id?.toString() || undefined}
                      onValueChange={(value) =>
                        setHandoverData(prev => ({ ...prev, handover_to_user_id: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select CA to handover to" />
                      </SelectTrigger>
                      <SelectContent>
                        {clinicAssistants.map(ca => (
                          <SelectItem key={ca.id} value={ca.id.toString()}>
                            {ca.name} ({ca.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="handover-department">Department *</Label>
                    <Select
                      value={handoverData.handover_to_department_id?.toString() || undefined}
                      onValueChange={(value) =>
                        setHandoverData(prev => ({ ...prev, handover_to_department_id: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept.value} value={dept.value.toString()}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="handover-location">Location (Optional)</Label>
                    <Select
                      value={handoverData.handover_to_location_id?.toString() || undefined}
                      onValueChange={(value) =>
                        setHandoverData(prev => ({
                          ...prev,
                          handover_to_location_id: value ? parseInt(value) : undefined
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(location => (
                          <SelectItem key={location.value} value={location.value.toString()}>
                            {location.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="handover-reason">Handover Reason</Label>
                    <Textarea
                      id="handover-reason"
                      placeholder="Explain why you're handing over this case note..."
                      value={handoverData.handover_reason || ''}
                      onChange={(e) =>
                        setHandoverData(prev => ({ ...prev, handover_reason: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleSubmitHandover}
                      disabled={submitting || !handoverData.handover_to_user_id || !handoverData.handover_to_department_id}
                      className="flex-1"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                      )}
                      Handover Case Note
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedCaseNote(null);
                        setHandoverData({});
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Handover History & Status Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Handover History
          </CardTitle>
          <CardDescription>
            Track the status of case notes you've handed over
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Handover History</h3>
            <p>This section will show the status of all case notes you've handed over.</p>
            <p className="text-sm mt-2">
              • Pending Acknowledgement = Waiting for receiving CA to acknowledge<br/>
              • Acknowledged = Receiving CA confirmed they received it<br/>
              • Overdue = Receiving CA did not acknowledge within 6 hours
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HandoverCaseNotesPage;
