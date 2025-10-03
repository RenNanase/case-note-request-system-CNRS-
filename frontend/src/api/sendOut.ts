import apiClient from './client';
import type { ApiResponse, CaseNoteRequest } from '@/types/requests';
import type { User } from '@/types/auth';

// Send Out Case Notes API
export const sendOutApi = {
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
    doctor_id?: number;
    case_note_ids: number[];
    notes?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/send-out/send', data);
    return response.data;
  },

  // Get received case notes for the current CA
  getReceivedCaseNotes: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/send-out/received');
    return response.data;
  },

  // Get case notes from a specific sender for acknowledgment
  getCaseNotesFromSender: async (senderId: number): Promise<ApiResponse<any>> => {
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
};

export default sendOutApi;
