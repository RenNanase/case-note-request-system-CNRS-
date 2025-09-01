import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, AlertCircle, FileText, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PatientSearch from '@/components/patients/PatientSearch';
import { HandoverRequestModal } from '@/components/modals/HandoverRequestModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { Patient } from '@/types/requests';

// Utility functions for handling null/undefined patient data
const formatDateOfBirth = (dateOfBirth: string | null | undefined): string => {
  if (!dateOfBirth) return '-';

  try {
    const date = new Date(dateOfBirth);
    // Check if the date is valid
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return '-';
  }
};



const formatNRIC = (nric: string | null | undefined, nationalityId: string | null | undefined): string => {
  return nric || nationalityId || '-';
};

export default function PatientSearchPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Handover request modal state
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [selectedPatientForHandover, setSelectedPatientForHandover] = useState<Patient | null>(null);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const handleClearSelection = () => {
    setSelectedPatient(null);
  };

  // Handover request handlers
  const handleRequestHandover = (patient: Patient) => {
    console.log('🔵 Request Handover clicked for patient:', patient.name);
    setSelectedPatientForHandover(patient);
    setShowHandoverModal(true);
  };

  const handleHandoverRequestSuccess = () => {
    setShowHandoverModal(false);
    setSelectedPatientForHandover(null);
    toast({
      title: 'Success',
      description: 'Handover request submitted successfully!',
      variant: 'default',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Patient Search</h1>
        <p className="text-gray-600 mt-2">
          Search for patients in the hospital database
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Patients</span>
          </CardTitle>
          <CardDescription>
            Search by Medical Record Number (MRN), NRIC, or patient name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PatientSearch
            onPatientSelect={handlePatientSelect}
            selectedPatient={selectedPatient || undefined}
            placeholder="Search by MRN, NRIC, or patient name..."
            onRequestHandover={handleRequestHandover}
          />
        </CardContent>
      </Card>

      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Patient Details</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
              >
                Clear Selection
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Patient Name</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedPatient.name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Medical Record Number (MRN)</label>
                  <p className="text-gray-900">{selectedPatient.mrn}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">NRIC</label>
                  <p className="text-gray-900">{formatNRIC(selectedPatient.nric, selectedPatient.nationality_id)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                  <p className="text-gray-900">{formatDateOfBirth(selectedPatient.date_of_birth)}</p>
                </div>

                {selectedPatient.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-gray-900">{selectedPatient.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {selectedPatient.has_medical_alerts && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h4 className="font-medium text-red-900">Medical Alerts</h4>
                </div>
                <p className="text-sm text-red-700 mt-2">
                  This patient has medical alerts on file. Please check the patient's medical record for details.
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center space-x-4">
              {hasPermission('create_requests') && (
                <Button asChild>
                  <Link
                    to="/requests/new"
                    state={{ selectedPatient }}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Case Note Request</span>
                  </Link>
                </Button>
              )}

              <Button variant="outline" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>View Medical History</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedPatient && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Patient Selected</h3>
            <p className="text-gray-500">
              Use the search above to find and select a patient to view their details.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Handover Request Modal */}
      <HandoverRequestModal
        patient={selectedPatientForHandover}
        isOpen={showHandoverModal}
        onClose={() => setShowHandoverModal(false)}
        onSuccess={handleHandoverRequestSuccess}
      />
    </div>
  );
}
