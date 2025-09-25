import apiClient from './client';

export interface OpenedCaseNote {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_mrn: string;
  department_id: number;
  department_name: string;
  location_id: number;
  location_name: string;
  doctor_id: number;
  doctor_name: string;
  user_type: string;
  user_type_label: string;
  remarks: string;
  opened_by_user_id: number;
  opened_by_name: string;
  opened_at: string;
  status: string;
}

export interface OpenCaseNoteRequest {
  patient_id: number;
  department_id: number;
  location_id: number;
  doctor_id: number;
  user_type: string;
  remarks: string;
}

export interface PatientRestriction {
  patient_id: number;
  patient_name: string;
  patient_mrn: string;
  department_name: string;
  location_name: string;
  doctor_name: string;
  user_type_label: string;
  remarks: string;
  opened_by_name: string;
  opened_at: string;
}

export const openedCaseNotesApi = {
  /**
   * Get all opened case notes
   */
  async getAll(): Promise<{ success: boolean; data?: OpenedCaseNote[]; message?: string }> {
    const response = await apiClient.get('/opened-case-notes');
    return response.data;
  },

  /**
   * Open a new case note
   */
  async openCaseNote(data: OpenCaseNoteRequest): Promise<{ success: boolean; data?: OpenedCaseNote; message?: string }> {
    const response = await apiClient.post('/opened-case-notes', data);
    return response.data;
  },

  /**
   * Check if a patient has restrictions
   */
  async checkPatientRestriction(patientId: number): Promise<{ success: boolean; has_restriction: boolean; data?: PatientRestriction; message?: string }> {
    const response = await apiClient.post('/opened-case-notes/check-restriction', {
      patient_id: patientId
    });
    return response.data;
  },

  /**
   * Deactivate an opened case note
   */
  async deactivateCaseNote(id: number): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post(`/opened-case-notes/${id}/deactivate`);
    return response.data;
  },
};
