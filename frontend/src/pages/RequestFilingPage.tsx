import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { requestsApi } from '@/api/requests';
import {
  Users,
  Search,
  Loader2,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  UserCircle,
  Plus,
  Eye,
  Calendar,
  User,
  Hash,
  FileCheck
} from 'lucide-react';

interface Patient {
  id: number;
  name: string;
  mrn: string;
  nric: string;
  nationality_id?: string;
}

interface FilingRequest {
  id: number;
  filing_number: string;
  status: 'pending' | 'approved' | 'rejected';
  patient_ids?: number[];
  case_note_description?: string;
  expected_case_note_count?: number;
  submission_notes?: string;
  approval_notes?: string;
  created_at: string;
  approved_at?: string;
  approved_by?: {
    name: string;
  };
  patients?: Patient[];
  patient_count?: number;
  is_patient_based?: boolean;
}

const RequestFilingPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [filingRequests, setFilingRequests] = useState<FilingRequest[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<Set<number>>(new Set());
  const [selectedPatientsData, setSelectedPatientsData] = useState<Patient[]>([]);
  const [caseNoteDescription, setCaseNoteDescription] = useState('');
  const [expectedCaseNoteCount, setExpectedCaseNoteCount] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedFilingRequest, setSelectedFilingRequest] = useState<FilingRequest | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const loadFilingRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await requestsApi.getCAFilingRequests();
      if (response.success) {
        setFilingRequests(response.filing_requests || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load filing requests history',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading filing requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load filing requests history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!hasRole('CA')) {
      toast({
        title: 'Access Denied',
        description: 'Only Clinic Assistants can access this page.',
        variant: 'destructive',
      });
      return;
    }
    loadFilingRequests();
  }, [hasRole, toast, loadFilingRequests]);

  const searchPatients = async (searchValue?: string) => {
    const search = searchValue || searchTerm.trim();
    if (search.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await requestsApi.searchPatientsForFiling(search);
      if (response.success) {
        setSearchResults(response.patients || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to search patients',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error searching patients:', error);
      toast({
        title: 'Error',
        description: 'Failed to search patients',
        variant: 'destructive',
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchPatients();
    }
  };

  const handlePatientToggle = (patient: Patient, checked: boolean) => {
    const newSelected = new Set(selectedPatients);
    let newSelectedData = [...selectedPatientsData];

    if (checked) {
      newSelected.add(patient.id);
      if (!selectedPatientsData.find(p => p.id === patient.id)) {
        newSelectedData.push(patient);
      }
    } else {
      newSelected.delete(patient.id);
      newSelectedData = newSelectedData.filter(p => p.id !== patient.id);
    }

    setSelectedPatients(newSelected);
    setSelectedPatientsData(newSelectedData);
  };

  const removeSelectedPatient = (patientId: number) => {
    const newSelected = new Set(selectedPatients);
    newSelected.delete(patientId);
    setSelectedPatients(newSelected);
    setSelectedPatientsData(prev => prev.filter(p => p.id !== patientId));
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleSubmitFilingRequest = async () => {
    // Validation
    if (selectedPatients.size === 0) {
      toast({
        title: 'No Patients Selected',
        description: 'Please select at least one patient for the filing request.',
        variant: 'destructive',
      });
      return;
    }

    if (!caseNoteDescription.trim()) {
      toast({
        title: 'Missing Description',
        description: 'Please provide a description of the case notes needed.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      const requestData = {
        patient_ids: Array.from(selectedPatients),
        case_note_description: caseNoteDescription.trim(),
        expected_case_note_count: expectedCaseNoteCount ? parseInt(expectedCaseNoteCount) : undefined,
        submission_notes: submissionNotes.trim() || undefined,
      };

      const response = await requestsApi.submitPatientFilingRequest(requestData);

      if (response.success) {
        toast({
          title: 'Success',
          description: `Successfully submitted filing request for ${selectedPatients.size} patient(s).`,
          variant: 'success',
        });

        // Reset form
        setSelectedPatients(new Set());
        setSelectedPatientsData([]);
        setCaseNoteDescription('');
        setExpectedCaseNoteCount('');
        setSubmissionNotes('');
        setSearchTerm('');
        setSearchResults([]);

        // Reload filing requests and switch to history tab
        await loadFilingRequests();
        setActiveTab('history');
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to submit filing request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting filing request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit filing request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: {
        variant: 'outline' as const,
        className: 'border-yellow-300 text-yellow-700 bg-yellow-50',
        icon: Clock
      },
      approved: {
        variant: 'outline' as const,
        className: 'border-green-300 text-green-700 bg-green-50',
        icon: CheckCircle
      },
      rejected: {
        variant: 'outline' as const,
        className: 'border-red-300 text-red-700 bg-red-50',
        icon: XCircle
      }
    };

    const { className, icon: Icon } = config[status as keyof typeof config] || config.pending;

    return (
      <Badge variant="outline" className={className}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleViewDetails = (filingRequest: FilingRequest) => {
    setSelectedFilingRequest(filingRequest);
    setDetailsModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!hasRole('CA')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">Only Clinic Assistants can access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Request Filing</h1>
          <p className="text-gray-600 mt-2">
            Search and select patients for case note filing requests
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'submit'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            New Filing Request
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Filing History
          </button>
        </div>

        {/* Submit Tab */}
        {activeTab === 'submit' && (
          <div className="space-y-6">
            {/* Patient Search */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Patients
                </CardTitle>
                <CardDescription>
                  Search for patients by name, MRN, or NRIC to include in your filing request.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search patients by name, MRN, or NRIC..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={() => searchPatients()}
                    disabled={searchLoading || searchTerm.length < 2}
                    variant="outline"
                  >
                    {searchLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                  {searchTerm && (
                    <Button onClick={clearSearch} variant="outline">
                      Clear
                    </Button>
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    <h4 className="font-medium text-gray-700">Search Results:</h4>
                    {searchResults.map(patient => (
                      <div
                        key={patient.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                          selectedPatients.has(patient.id)
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Checkbox
                          id={`patient-${patient.id}`}
                          checked={selectedPatients.has(patient.id)}
                          onCheckedChange={(checked) =>
                            handlePatientToggle(patient, checked as boolean)
                          }
                        />
                        <UserCircle className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <Label
                            htmlFor={`patient-${patient.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {patient.name}
                          </Label>
                          <div className="text-sm text-gray-500">
                            MRN: {patient.mrn} | NRIC: {patient.nric}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Patients */}
            {selectedPatientsData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Selected Patients ({selectedPatientsData.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedPatientsData.map(patient => (
                      <div
                        key={patient.id}
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <UserCircle className="h-4 w-4 text-blue-600" />
                          <div>
                            <div className="font-medium text-blue-900">{patient.name}</div>
                            <div className="text-sm text-blue-700">
                              MRN: {patient.mrn} | NRIC: {patient.nric}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSelectedPatient(patient.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filing Request Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filing Request Details</CardTitle>
                <CardDescription>
                  Provide details about the case notes you need for the selected patients.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="caseNoteDescription" className="text-sm font-medium">
                    Case Note Description *
                  </Label>
                  <Textarea
                    id="caseNoteDescription"
                    placeholder="Describe what case notes are needed (e.g., 'Latest consultation notes', 'All records from 2024', 'Surgery records', etc.)"
                    value={caseNoteDescription}
                    onChange={(e) => setCaseNoteDescription(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Please be specific about what type of case notes you need.
                  </p>
                </div>

                <div>
                  <Label htmlFor="expectedCount" className="text-sm font-medium">
                    Expected Number of Case Notes (Optional)
                  </Label>
                  <Input
                    id="expectedCount"
                    type="number"
                    placeholder="e.g., 5"
                    value={expectedCaseNoteCount}
                    onChange={(e) => setExpectedCaseNoteCount(e.target.value)}
                    className="mt-1 w-32"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Approximate number of case notes you expect to receive.
                  </p>
                </div>



                <div className="flex justify-between items-center pt-4">
                  <div className="text-sm text-gray-600">
                    {selectedPatients.size} patient(s) selected
                  </div>
                  <Button
                    onClick={handleSubmitFilingRequest}
                    disabled={submitting || selectedPatients.size === 0 || !caseNoteDescription.trim()}
                    className="min-w-32"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Filing Request'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Filing Request History
              </CardTitle>
              <CardDescription>
                Track all your submitted filing requests and their status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin mr-3" />
                  <span>Loading filing history...</span>
                </div>
              ) : filingRequests.length === 0 ? (
                <div className="text-center text-gray-500 p-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No Filing Requests</h3>
                  <p>You haven't submitted any filing requests yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filingRequests.map(filingRequest => (
                    <div
                      key={filingRequest.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-gray-400" />
                            <h3 className="font-semibold text-gray-900">
                              {filingRequest.filing_number}
                            </h3>
                          </div>
                          {getStatusBadge(filingRequest.status)}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-500">
                            {formatDate(filingRequest.created_at)}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(filingRequest)}
                            className="h-8 px-3"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-700">Patients:</span>
                          <span>{filingRequest.patient_count || filingRequest.patient_ids?.length || 0}</span>
                        </div>
                        {filingRequest.expected_case_note_count && (
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-700">Expected:</span>
                            <span>{filingRequest.expected_case_note_count} case notes</span>
                          </div>
                        )}
                        {filingRequest.approved_by && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-700">Processed by:</span>
                            <span>{filingRequest.approved_by.name}</span>
                          </div>
                        )}
                      </div>

                      {filingRequest.case_note_description && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="text-sm font-medium text-blue-800 mb-1">
                            Case Note Description:
                          </div>
                          <div className="text-sm text-blue-700">
                            {filingRequest.case_note_description}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      {/* Filing Request Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Filing Request Details - {selectedFilingRequest?.filing_number}
            </DialogTitle>
            <DialogDescription>
              Complete details for filing request submitted on {selectedFilingRequest ? formatDate(selectedFilingRequest.created_at) : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedFilingRequest && (
            <div className="space-y-6">
              {/* Request Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Request Number:</span>
                    <span className="font-mono text-sm">{selectedFilingRequest.filing_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Submitted:</span>
                    <span className="text-sm">{formatDate(selectedFilingRequest.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    {getStatusBadge(selectedFilingRequest.status)}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Patients:</span>
                    <span className="text-sm">{selectedFilingRequest.patient_count || selectedFilingRequest.patient_ids?.length || 0}</span>
                  </div>
                  {selectedFilingRequest.expected_case_note_count && (
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Expected Case Notes:</span>
                      <span className="text-sm">{selectedFilingRequest.expected_case_note_count}</span>
                    </div>
                  )}
                  {selectedFilingRequest.approved_by && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Processed by:</span>
                      <span className="text-sm">{selectedFilingRequest.approved_by.name}</span>
                    </div>
                  )}
                  {selectedFilingRequest.approved_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Processed on:</span>
                      <span className="text-sm">{formatDate(selectedFilingRequest.approved_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Case Note Description */}
              {selectedFilingRequest.case_note_description && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Case Note Description</span>
                  </div>
                  <p className="text-blue-700">{selectedFilingRequest.case_note_description}</p>
                </div>
              )}

              {/* Patient List */}
              {selectedFilingRequest.patients && selectedFilingRequest.patients.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-800">Patients Included</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedFilingRequest.patients.map(patient => (
                      <div key={patient.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <UserCircle className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{patient.name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          MRN: {patient.mrn}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submission Notes */}
              {selectedFilingRequest.submission_notes && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-800">Submission Notes</span>
                  </div>
                  <p className="text-gray-700">{selectedFilingRequest.submission_notes}</p>
                </div>
              )}

              {/* Approval/Rejection Notes */}
              {selectedFilingRequest.approval_notes && (
                <div className={`p-4 border rounded-lg ${
                  selectedFilingRequest.status === 'approved' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className={`h-4 w-4 ${
                      selectedFilingRequest.status === 'approved' ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <span className={`font-medium ${
                      selectedFilingRequest.status === 'approved' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {selectedFilingRequest.status === 'approved' ? 'Approval' : 'Rejection'} Notes
                    </span>
                  </div>
                  <p className={`${
                    selectedFilingRequest.status === 'approved' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {selectedFilingRequest.approval_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestFilingPage;
