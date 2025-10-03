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
import type { User } from '@/types/auth';

// Case Note Request API
const requestsApi = {
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

  // Get requests with filtering and pagination
  getRequests: async (params?: RequestsListParams): Promise<RequestsListResponse> => {
    const response = await apiClient.get('/requests', { params });
    return response.data;
  },

  // Create a new request
  createRequest: async (data: RequestFormData): Promise<CreateRequestResponse> => {
    const response = await apiClient.post('/requests', data);
    return response.data;
  },

  // Get a specific request by ID
  getRequest: async (id: number): Promise<RequestDetailsResponse> => {
    const response = await apiClient.get(`/requests/${id}`);
    return response.data;
  },

  // Update a request
  updateRequest: async (id: number, data: Partial<RequestFormData>): Promise<ApiResponse<CaseNoteRequest>> => {
    const response = await apiClient.put(`/requests/${id}`, data);
    return response.data;
  },

  // Delete a request
  deleteRequest: async (id: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/requests/${id}`);
    return response.data;
  },

  // Approve a request
  approveRequest: async (id: number, approvalData?: { approved_by_notes?: string }): Promise<ApiResponse<CaseNoteRequest>> => {
    const response = await apiClient.post(`/requests/${id}/approve`, approvalData);
    return response.data;
  },

  // Approve a request on behalf of another user
  approveRequestOnBehalf: async (id: number, data: { remarks?: string; on_behalf_of_user_id: number }): Promise<ApiResponse<CaseNoteRequest>> => {
    const response = await apiClient.post(`/requests/${id}/approve-on-behalf`, data);
    return response.data;
  },

  // Reject a request
  rejectRequest: async (id: number, rejectionData: { rejection_reason: string }): Promise<ApiResponse<CaseNoteRequest>> => {
    const reason = rejectionData.rejection_reason?.trim() || 'No reason provided';
    if (!reason || reason.length === 0) {
      throw new Error('Rejection reason is required');
    }
    console.log('🔴 Rejection payload:', { id, reason });
    const response = await apiClient.post(`/requests/${id}/reject`, {reason: reason});
    return response.data;
  },

  // Complete a request
  completeRequest: async (id: number): Promise<ApiResponse<CaseNoteRequest>> => {
    const response = await apiClient.post(`/requests/${id}/complete`);
    return response.data;
  },

  // Get returnable case notes
  getReturnableCaseNotes: async (): Promise<ApiResponse<CaseNoteRequest[]> & { case_notes: CaseNoteRequest[] }> => {
    const response = await apiClient.get('/requests/returnable');
    return response.data;
  },

  // Return case notes
  returnCaseNotes: async (data: { case_note_ids: number[]; return_notes?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/case-notes/return', data);
    return response.data;
  },

  // Get my requests
  getMyRequests: async (): Promise<ApiResponse<CaseNoteRequest[]>> => {
    const response = await apiClient.get('/requests');
    return response.data;
  },

  // Verify case notes received
  verifyCaseNotesReceived: async (data: VerificationSubmission): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/case-notes/verify-received', data);
    return response.data;
  },

  // Reject case notes not received
  rejectCaseNotesNotReceived: async (data: RejectionSubmission): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/case-notes/reject-not-received', data);
    return response.data;
  },

  // Get approved case notes for verification
  getApprovedCaseNotesForVerification: async (): Promise<ApiResponse<CaseNoteRequest[]>> => {
    const response = await apiClient.get('/case-notes/approved-for-verification');
    return response.data;
  },

  // Get approved case notes for specific user
  getApprovedCaseNotesForUser: async (userId: number): Promise<ApiResponse<CaseNoteRequest[]>> => {
    const response = await apiClient.get(`/case-notes/approved-for-user/${userId}`);
    return response.data;
  },

  // Verify case notes on behalf
  verifyCaseNotesOnBehalf: async (data: VerificationSubmission): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/case-notes/verify-on-behalf', data);
    return response.data;
  },

  // Get returned submissions
  getReturnedSubmissions: async (): Promise<ApiResponse<CaseNoteRequest[]>> => {
    const response = await apiClient.get('/case-notes/returned-submissions');
    return response.data;
  },

  // Verify returned case notes
  verifyReturnedCaseNotes: async (data: { case_note_ids: number[]; action: string; verification_notes?: string; rejection_reason?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/case-notes/verify-returned', data);
    return response.data;
  },

  // Generate Returned Case Notes PDF (MR)
  generateReturnedCaseNotesPdf: async (caId: number, caseNoteIds?: number[]): Promise<Blob> => {
    const response = await apiClient.get(`/case-notes/returned/ca/${caId}/pdf`, {
      params: caseNoteIds && caseNoteIds.length > 0 ? { case_note_ids: caseNoteIds.join(',') } : {},
      responseType: 'blob'
    });
    return response.data;
  },

  // Generate case note list PDF
  generateCaseNoteListPdf: async (caId: number, requestIds?: number[]): Promise<Blob> => {
    const response = await apiClient.get(`/requests/ca/${caId}/pdf`, {
      params: requestIds ? { request_ids: requestIds.join(',') } : {},
      responseType: 'blob'
    });
    return response.data;
  },

  // Search case notes
  searchCaseNotes: async (query: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/case-notes/search', { params: { q: query } });
    return response.data;
  },

  // Get case note timeline
  getCaseNoteTimeline: async (caseNoteId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/case-notes/${caseNoteId}/timeline`);
    return response.data;
  },

  // Get case note tracking
  getCaseNoteTracking: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/case-notes/tracking', { params });
    return response.data;
  },

  // Export case note tracking
  exportCaseNoteTracking: async (params?: any): Promise<Blob> => {
    const response = await apiClient.get('/case-notes/tracking/export', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // Generate case note tracking PDF
  generateCaseNoteTrackingPdf: async (params?: any): Promise<Blob> => {
    const response = await apiClient.get('/case-notes/tracking/pdf', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // NEW: Patient-based filing methods
  searchPatientsForFiling: async (search: string, limit: number = 50) => {
    try {
      const response = await apiClient.get('/filing-requests/patients/search', {
        params: { search, limit }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error searching patients for filing:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to search patients',
        patients: []
      };
    }
  },

  submitPatientFilingRequest: async (data: {
    patient_ids: number[];
    case_note_description: string;
    expected_case_note_count?: number;
    submission_notes?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/filing-requests/patients/submit', data);
    return response.data;
  },

  // Filing request methods
  getCAFilingRequests: async () => {
    try {
      const response = await apiClient.get('/filing-requests/ca');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching CA filing requests:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch CA filing requests'
      };
    }
  },
  // Generate filing request list PDF (MR Staff)
  generateFilingRequestListPdf: async (caId: number, filingRequestIds?: number[]): Promise<Blob> => {
    const response = await apiClient.get(`/filing-requests/ca/${caId}/pdf`, {
      params: filingRequestIds && filingRequestIds.length > 0 ? { filing_request_ids: filingRequestIds.join(',') } : {},
      responseType: 'blob'
    });
    return response.data;
  },

  getMRFilingRequests: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/filing-requests/mr');
    return response.data;
  },

  getFilingRequestsByCA: async (caUserId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/filing-requests/by-ca/${caUserId}`);
    return response.data;
  },

  approveFilingRequest: async (id: number, approvalNotes?: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/filing-requests/${id}/approve`, {
      approval_notes: approvalNotes
    });
    return response.data;
  },

  rejectFilingRequest: async (id: number, rejectionNotes?: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/filing-requests/${id}/reject`, {
      rejection_notes: rejectionNotes
    });
    return response.data;
  },

  getFilingRequestDetails: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/filing-requests/${id}`);
    return response.data;
  },

  // Legacy case note filing (keep for compatibility)
  getAvailableCaseNotes: async (search?: string) => {
    try {
      const params = search ? { search } : {};
      const response = await apiClient.get('/filing-requests/available-case-notes', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching available case notes:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch available case notes'
      };
    }
  },

  submitFilingRequest: async (data: { case_note_ids: number[]; submission_notes?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/filing-requests/submit', data);
    return response.data;
  },

  // Individual requests
  getIndividualRequests: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/individual-requests');
    return response.data;
  },

  createIndividualRequest: async (data: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/individual-requests', data);
    return response.data;
  },

  deleteIndividualRequest: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/individual-requests/${id}`);
    return response.data;
  },

  // Batch requests
  getBatchRequests: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/batch-requests');
    return response.data;
  },

  createBatchRequest: async (data: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/batch-requests', data);
    return response.data;
  },

  verifyBatchReceipt: async (id: number, data: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/batch-requests/${id}/verify-receipt`, data);
    return response.data;
  },

  verifyIndividualReceipt: async (id: number, data: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/batch-requests/${id}/verify-individual`, data);
    return response.data;
  },

  // Handover methods
  createHandover: async (data: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/handovers', data);
    return response.data;
  },

  getPendingHandovers: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/handovers/pending');
    return response.data;
  },

  verifyHandover: async (handoverId: number, data?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/handovers/${handoverId}/verify`, data);
    return response.data;
  },

  // Handover requests
  getMyHandoverRequests: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/handover-requests/my-requests');
    return response.data;
  },

  getIncomingHandoverRequests: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/handover-requests/incoming');
    return response.data;
  },

  getHandoverRequestsPendingVerification: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/handover-requests/pending-verification');
    return response.data;
  },

  respondToHandoverRequest: async (handoverRequestId: number, data: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/handover-requests/${handoverRequestId}/respond`, data);
    return response.data;
  },

  verifyHandoverRequest: async (handoverRequestId: number, data?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/handover-requests/${handoverRequestId}/verify`, data);
    return response.data;
  },

  requestHandover: async (caseNoteId: number, data: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/case-notes/${caseNoteId}/request-handover`, data);
    return response.data;
  },

  // User methods
  getUsers: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  getCAUsers: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/users/ca-users');
    return response.data;
  },

  getCaseNoteRequestId: async (mrn: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/patients/mrn/${mrn}/case-note-request`);
    return response.data;
  },

  exportRequest: async (id: number, format: 'pdf' | 'excel' = 'pdf'): Promise<ApiResponse<{ downloadUrl: string }>> => {
    return apiClient.get(`/requests/${id}/export`, {
      params: { format },
      responseType: 'blob'
    }).then(response => {
      // Create a URL for the blob
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const downloadUrl = window.URL.createObjectURL(blob);

      return {
        success: true,
        data: { downloadUrl },
        headers: response.headers
      };
    });
  }
};

// Patient API
export const patientsApi = {
  search: async (search: string): Promise<PatientSearchResponse> => {
    const response = await apiClient.get('/patients/search', {
      params: { search }
    });
    return response.data;
  },

  get: async (id: number): Promise<ApiResponse<Patient>> => {
    const response = await apiClient.get(`/patients/${id}`);
    return response.data;
  }
};

// Resources API
export const resourcesApi = {
  departments: async (): Promise<DepartmentsResponse> => {
    const response = await apiClient.get('/resources/departments');
    return response.data;
  },

  getDepartments: async (): Promise<DepartmentsResponse> => {
    const response = await apiClient.get('/resources/departments');
    return response.data;
  },

  doctors: async (): Promise<DoctorsResponse> => {
    const response = await apiClient.get('/resources/doctors');
    return response.data;
  },

  getDoctors: async (departmentId?: number): Promise<DoctorsResponse> => {
    const params = departmentId ? { department_id: departmentId } : {};
    const response = await apiClient.get('/resources/doctors', { params });
    return response.data;
  },

  locations: async (): Promise<LocationsResponse> => {
    const response = await apiClient.get('/resources/locations');
    return response.data;
  },

  getLocations: async (): Promise<LocationsResponse> => {
    const response = await apiClient.get('/resources/locations');
    return response.data;
  },

  priorities: async (): Promise<PrioritiesResponse> => {
    const response = await apiClient.get('/resources/priorities');
    return response.data;
  },

  getPriorities: async (): Promise<PrioritiesResponse> => {
    const response = await apiClient.get('/resources/priorities');
    return response.data;
  },

  statuses: async (): Promise<StatusesResponse> => {
    const response = await apiClient.get('/resources/statuses');
    return response.data;
  },

  getUsersByRole: async (role?: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/users', {
      params: role ? { role } : {}
    });
    return response.data;
  },

  getAvailableCaseNotes: async (search?: string) => {
    try {
      const params = search ? { search } : {};
      const response = await apiClient.get('/filing-requests/available-case-notes', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching available case notes:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch available case notes'
      };
    }
  },

  getCAFilingRequests: async () => {
    try {
      const response = await apiClient.get('/filing-requests/ca');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching CA filing requests:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch CA filing requests'
      };
    }
  }
};

// Admin Patients API
export const adminPatientsApi = {
  getAll: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/admin/patients', { params });
    return response.data;
  },

  getStatistics: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/admin/patients/statistics');
    return response.data;
  },

  importExcel: async (formData: FormData): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/admin/patients/import-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  downloadTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get('/admin/patients/import-template', {
      responseType: 'blob',
    });
    return response.data;
  },

  getImportProgress: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/admin/patients/import-progress');
    return response.data;
  },

  cancelImport: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/admin/patients/import/${id}/cancel`);
    return response.data;
  },

  // Filing Request API methods
  // Get CA's own filing requests
  getCAFilingRequests: async () => {
    try {
      const response = await apiClient.get('/filing-requests/ca');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching CA filing requests:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch CA filing requests'
      };
    }
  },

  // Get available case notes for filing
  getAvailableCaseNotes: async (search?: string) => {
    try {
      const params = search ? { search } : {};
      const response = await apiClient.get('/filing-requests/available-case-notes', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching available case notes:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch available case notes'
      };
    }
  },

  // Submit a filing request
  submitFilingRequest: async (data: { case_note_ids: number[]; submission_notes?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/filing-requests/submit', data);
    return response.data;
  },

  // Get all filing requests for MR staff
  getMRFilingRequests: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/filing-requests/mr');
    return response.data;
  },

  // Get filing requests by specific CA
  getFilingRequestsByCA: async (caUserId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/filing-requests/by-ca/${caUserId}`);
    return response.data;
  },

  // Approve a filing request
  approveFilingRequest: async (id: number, approvalNotes?: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/filing-requests/${id}/approve`, {
      approval_notes: approvalNotes
    });
    return response.data;
  },

  // Reject a filing request
  rejectFilingRequest: async (id: number, rejectionNotes?: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/filing-requests/${id}/reject`, {
      rejection_notes: rejectionNotes
    });
    return response.data;
  },

  // Get filing request details
  getFilingRequestDetails: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/filing-requests/${id}`);
    return response.data;
  },

  // Send Out Case Notes API
  sendOut: {
    // Get available case notes for sending out
    getAvailableCaseNotes: async (): Promise<ApiResponse<CaseNoteRequest[]>> => {
      const response = await apiClient.get('/send-out/available-case-notes');
      return response.data;
    },

    // Get CA users for sending out
    getCAUsers: async (): Promise<ApiResponse<{ users: User[] }>> => {
      const response = await apiClient.get('/send-out/ca-users');
      return response.data;
    },

    // Send out case notes to another CA
    sendOutCaseNotes: async (data: {
      sent_to_user_id: number;
      department_id: number;
      doctor_id: number;
      case_note_ids: number[];
      notes?: string;
    }): Promise<ApiResponse<any>> => {
      const response = await apiClient.post('/send-out/send', data);
      return response.data;
    },

    // Get received case notes for a CA
    getReceivedCaseNotes: async (): Promise<ApiResponse<any[]>> => {
      const response = await apiClient.get('/send-out/received');
      return response.data;
    },

    // Get case notes from a specific sender
    getCaseNotesFromSender: async (senderId: number): Promise<ApiResponse<{ case_notes: CaseNoteRequest[]; sender: User }>> => {
      const response = await apiClient.get(`/send-out/from-sender/${senderId}`);
      return response.data;
    },

    // Acknowledge received case notes
    acknowledgeCaseNotes: async (data: {
      case_note_ids: number[];
      acknowledgment_notes?: string;
    }): Promise<ApiResponse<any>> => {
      const response = await apiClient.post('/send-out/acknowledge', data);
      return response.data;
    },

    // Get send out history
    getSendOutHistory: async (type: 'sent' | 'received' = 'sent'): Promise<ApiResponse<any[]>> => {
      const response = await apiClient.get('/send-out/history', { params: { type } });
      return response.data;
    },

    // Get send out details
    getSendOutDetails: async (sendOutId: number): Promise<ApiResponse<any[]>> => {
      const response = await apiClient.get(`/send-out/details/${sendOutId}`);
      return response.data;
    },
  }
};

// Combined exports for convenience
export { requestsApi };
export default requestsApi;
