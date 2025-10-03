import apiClient from './client';
import type {
  CaseNoteRequest,
  RequestFormData,
  RequestsListParams,
  RequestsListResponse,
  RequestDetailsResponse,
  DashboardStatsResponse,
  ApiResponse,
  PatientSearchResponse,
  DepartmentsResponse,
  DoctorsResponse,
  LocationsResponse,
  PrioritiesResponse,
  StatusesResponse,
  Patient,
  CreateRequestResponse,
  VerificationSubmission,
  RejectionSubmission
} from '@/types/requests';

// Case Note Request API
export const requestsApi = {
  // Get dashboard stats
  getDashboardStats: async (): Promise<DashboardStatsResponse> => {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },

  // Get optimized dashboard stats (consolidated)
  getOptimizedDashboardStats: async (): Promise<DashboardStatsResponse> => {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },

  // List requests with filters and pagination
  getRequests: async (params?: RequestsListParams): Promise<RequestsListResponse> => {
    const response = await apiClient.get('/requests', { params });
    return response.data;
  },

  // Get single request details
  getRequest: async (id: number): Promise<RequestDetailsResponse> => {
    const response = await apiClient.get(`/requests/${id}`);
    return response.data;
  },

  // Create new request
  createRequest: async (data: RequestFormData): Promise<CreateRequestResponse> => {
    const response = await apiClient.post('/requests', data);
    return response.data;
  },

  // Update request
  updateRequest: async (id: number, data: Partial<RequestFormData>): Promise<ApiResponse<CaseNoteRequest>> => {
    const response = await apiClient.put(`/requests/${id}`, data);
    return response.data;
  },

  // Delete request
  deleteRequest: async (id: number): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/requests/${id}`);
    return response.data;
  },

  // Approve request (MR Staff only)
  approveRequest: async (id: number, remarks?: string): Promise<ApiResponse<CaseNoteRequest>> => {
    const response = await apiClient.post(`/requests/${id}/approve`, { remarks });
    return response.data;
  },

  // Reject request (MR Staff only)
  rejectRequest: async (id: number, reason: string): Promise<ApiResponse<CaseNoteRequest>> => {
    const response = await apiClient.post(`/requests/${id}/reject`, { reason });
    return response.data;
  },

  // Complete request (MR Staff only)
  completeRequest: async (id: number, notes?: string): Promise<ApiResponse<CaseNoteRequest>> => {
    const response = await apiClient.post(`/requests/${id}/complete`, { notes });
    return response.data;
  },

  // Reopen request (if needed)
  reopenRequest: async (id: number, reason: string): Promise<ApiResponse<CaseNoteRequest>> => {
    const response = await apiClient.post(`/requests/${id}/reopen`, { reason });
    return response.data;
  },

  // Create handover
  createHandover: async (data: {
    case_note_request_id: number;
    handed_over_to_user_id: number;
    department_id: number;
    location_id?: number;
    handover_reason: string;
    additional_notes?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/handovers', data);
    return response.data;
  },

  // Get handover statistics
  getHandoverStats: async (): Promise<ApiResponse<{
    total_handovers: number;
    pending_handovers: number;
    completed_handovers: number;
  }>> => {
    const response = await apiClient.get('/handovers/stats');
    return response.data;
  },

  // Individual request methods
  createIndividualRequest: async (data: {
    patient_id: number;
    department_id: number;
    doctor_id?: number;
    location_id?: number;
    priority: string;
    purpose: string;
    needed_date: string;
    remarks?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/individual-requests', data);
    return response.data;
  },

  getIndividualRequests: async (params?: {
    search?: string;
    status?: string;
    priority?: string;
    department_id?: number;
    per_page?: number;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/individual-requests', { params });
    return response.data;
  },

  getIndividualRequest: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/individual-requests/${id}`);
    return response.data;
  },

  updateIndividualRequest: async (id: number, data: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/individual-requests/${id}`, data);
    return response.data;
  },

  deleteIndividualRequest: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/individual-requests/${id}`);
    return response.data;
  },

  getIndividualRequestStats: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/individual-requests/stats');
    return response.data;
  },

  // Batch request methods
  createBatchRequest: async (data: {
    case_notes: Array<{
      patient_id: number;
    }>;
    department_id: number;
    doctor_id?: number;
    location_id?: number;
    priority: string;
    purpose: string;
    needed_date: string;
    batch_notes?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/batch-requests', data);
    return response.data;
  },

  getBatchRequests: async (): Promise<any> => {
    const response = await apiClient.get('/batch-requests');
    return response.data;
  },

  getBatchRequest: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/batch-requests/${id}`);
    return response.data;
  },

  processBatchRequest: async (id: number, action: 'approve' | 'reject', notes?: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/batch-requests/${id}/process`, { action, processing_notes: notes });
    return response.data;
  },

  getBatchRequestStats: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/batch-requests/stats');
    return response.data;
  },

  verifyBatchReceipt: async (id: number, data: {
    received_count: number;
    verification_notes?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/batch-requests/${id}/verify-receipt`, data);
    return response.data;
  },

  verifyIndividualReceipt: async (id: number, data: {
    received_case_notes: number[];
    verification_notes?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/batch-requests/${id}/verify-individual`, data);
    return response.data;
  },

  // Daily verification endpoints
  getApprovedCaseNotesForVerification: async (): Promise<ApiResponse<any> & { case_notes?: any[] }> => {
    const response = await apiClient.get('/case-notes/approved-for-verification');
    return response.data;
  },

  verifyCaseNotesReceived: async (data: VerificationSubmission): Promise<{ success: boolean; message?: string; verified_count?: number }> => {
    try {
      const response = await apiClient.post('/case-notes/verify-received', data);
      return response.data;
    } catch (error: any) {
      console.error('Error verifying case notes as received:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to verify case notes as received'
      };
    }
  },

  // Reject case notes as not received (Not Verify)
  rejectCaseNotesNotReceived: async (data: RejectionSubmission): Promise<{ success: boolean; message?: string; rejected_count?: number }> => {
    try {
      const response = await apiClient.post('/case-notes/reject-not-received', data);
      return response.data;
    } catch (error: any) {
      console.error('Error rejecting case notes as not received:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to reject case notes as not received'
      };
    }
  },

  // My requests endpoint
  getMyRequests: async (): Promise<ApiResponse<{ requests: any[] }>> => {
    const response = await apiClient.get('/requests?include_all_involvement=true');
    return response.data;
  },



  // Handover endpoint
  handoverRequest: async (id: number, data: {
    handover_to_user_id: number;
    handover_to_department_id: number;
    handover_to_location_id?: number;
    handover_reason: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/handovers`, {
      case_note_request_id: id,
      handed_over_to_user_id: data.handover_to_user_id,
      department_id: data.handover_to_department_id,
      location_id: data.handover_to_location_id,
      handover_reason: data.handover_reason,
    });
    return response.data;
  },

  // Get pending handovers for current user
  getPendingHandovers: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/handovers/pending');
    return response.data;
  },

  // Get Acknowledge handovers for current user (as receiver)
  getAcknowledgeHandovers: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/handovers/Acknowledge');
    return response.data;
  },

  // Search case notes by patient name, MRN, or nationality ID
  searchCaseNotes: async (query: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/case-notes/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  // Get timeline events for a specific case note
  getCaseNoteTimeline: async (caseNoteId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/case-notes/${caseNoteId}/timeline`);
    return response.data;
  },

  // Request handover for a case note
  requestHandover: async (caseNoteId: number, data: {
    reason: string;
    priority: string;
    department_id: number;
    location_id?: number;
    doctor_id?: number;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/case-notes/${caseNoteId}/request-handover`, data);
    return response.data;
  },

  // Get my handover requests
  getMyHandoverRequests: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/handover-requests/my-requests');
    return response.data;
  },

  // Get incoming handover requests
  getIncomingHandoverRequests: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/handover-requests/incoming');
    return response.data;
  },

  // Get all incoming handover requests for statistics
  getAllIncomingHandoverRequests: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/handover-requests/incoming-all');
    return response.data;
  },

  // Get handover requests pending verification by the requesting CA
  getHandoverRequestsPendingVerification: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/handover-requests/pending-verification');
    return response.data;
  },

  // Verify handover request by the requesting CA
  verifyHandoverRequest: async (handoverRequestId: number, data: {
    action: 'approve' | 'reject';
    verification_notes?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/handover-requests/${handoverRequestId}/verify`, data);
    return response.data;
  },

  // Respond to handover request
  respondToHandoverRequest: async (handoverRequestId: number, data: {
    action: 'approve' | 'reject';
    notes?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/handover-requests/${handoverRequestId}/respond`, data);
    return response.data;
  },

  // Get handover history for current user (as sender)
  getHandoverHistory: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/handovers/history');
    return response.data;
  },

  // Verify handover case note received
  verifyHandover: async (handoverId: number, data: {
    verification_notes?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/handovers/${handoverId}/verify`, data);
    return response.data;
  },

  // Get case note request ID by patient MRN
  getCaseNoteRequestId: async (mrn: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/patients/mrn/${encodeURIComponent(mrn)}/case-note-request`);
    return response.data;
  },

  // Get users by role (alias for getUsersByRole)
  getUsers: async (role: string): Promise<ApiResponse<{ users: any[] }>> => {
    const response = await apiClient.get(`/users?role=${role}`);
    return response.data;
  },

  // Return case notes
  returnCaseNotes: async (data: {
    case_note_ids: number[];
    return_notes?: string;
  }): Promise<{ success: boolean; message?: string; returned_count?: number }> => {
    try {
      const response = await apiClient.post('/case-notes/return', data);
      return response.data;
    } catch (error: any) {
      console.error('Error returning case notes:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to return case notes'
      };
    }
  },

  // Get returnable case notes (received but not yet returned)
  getReturnableCaseNotes: async (): Promise<{ success: boolean; requests?: any[]; case_notes?: any[]; message?: string }> => {
    try {
      const response = await apiClient.get('/requests/returnable');
      // The API returns 'case_notes' but frontend expects 'requests'
      // Map the response to maintain compatibility
      if (response.data.success && response.data.case_notes) {
        return {
          ...response.data,
          requests: response.data.case_notes // Map case_notes to requests for compatibility
        };
      }
      return response.data;
    } catch (error: any) {
      console.error('Error getting returnable case notes:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get returnable case notes'
      };
    }
  },

  // Get pending verification case notes (returned but waiting for MR staff verification)
  getPendingVerificationCaseNotes: async (): Promise<{ success: boolean; case_notes?: any[]; message?: string }> => {
    try {
      const response = await apiClient.get('/case-notes/pending-verification');
      return response.data;
    } catch (error: any) {
      console.error('Error getting pending verification case notes:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get pending verification case notes'
      };
    }
  }
};

// Patient Search API
export const patientsApi = {
  // Search patients by MRN, NRIC, or name
  searchPatients: async (query: string): Promise<PatientSearchResponse> => {
    const response = await apiClient.get(`/patients/search?search=${encodeURIComponent(query)}`);
    return response.data;
  },

  // Get patient by ID
  getPatient: async (id: number): Promise<ApiResponse<Patient>> => {
    const response = await apiClient.get(`/patients/${id}`);
    return response.data;
  }
};

// Admin Patient Import API
export const adminPatientsApi = {
  // Get import progress for ongoing imports
  getImportProgress: async (): Promise<ApiResponse<{
    active_imports: any[];
    recent_imports: any[];
  }>> => {
    const response = await apiClient.get('/admin/patients/import-progress');
    return response.data;
  },

  // Cancel an ongoing import
  cancelImport: async (importId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/admin/patients/import/${importId}/cancel`);
    return response.data;
  },

  // Import Excel file
  importExcel: async (file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('excel_file', file);

    const response = await apiClient.post('/admin/patients/import-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get import template
  getImportTemplate: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/admin/patients/import-template');
    return response.data;
  }
};

// Resource APIs (for form dropdowns)
export const resourcesApi = {
  // Get departments
  getDepartments: async (): Promise<DepartmentsResponse> => {
    const response = await apiClient.get('/resources/departments');
    return response.data;
  },

  // Get doctors by department
  getDoctors: async (departmentId?: number): Promise<DoctorsResponse> => {
    const params = departmentId ? { department_id: departmentId } : {};
    const response = await apiClient.get('/resources/doctors', { params });
    return response.data;
  },

  // Get locations
  getLocations: async (): Promise<LocationsResponse> => {
    const response = await apiClient.get('/resources/locations');
    return response.data;
  },

  // Get priorities
  getPriorities: async (): Promise<PrioritiesResponse> => {
    const response = await apiClient.get('/resources/priorities');
    return response.data;
  },

  // Get statuses
  getStatuses: async (): Promise<StatusesResponse> => {
    const response = await apiClient.get('/resources/statuses');
    return response.data;
  },

  // Get users by role
  getUsersByRole: async (role: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/users?role=${role}`);
    return response.data;
  }
};

// Combined exports for convenience
export default requestsApi;
