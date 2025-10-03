import apiClient from './client';

export interface HandoverCaseNote {
  id: number;
  case_note_request_id: number;
  handed_over_by_user_id: number;
  handed_over_to_user_id: number;
  department_id: number;
  location_id?: number;
  handover_doctor_id?: number;
  handover_reason: string;
  additional_notes?: string;
  status: 'pending' | 'Acknowledge' | 'completed';
  Acknowledge_at?: string;
  Acknowledge_by_user_id?: number;
  acknowledgment_notes?: string;
  receipt_verification_notes?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  caseNoteRequest: {
    id: number;
    request_number: string;
    patient: {
      id: number;
      name: string;
      mrn: string;
    };
    department: {
      name: string;
    };
    purpose: string;
    priority: string;
  };
  handedOverBy: {
    id: number;
    name: string;
  };
  handedOverTo: {
    id: number;
    name: string;
  };
  department: {
    name: string;
  };
  location?: {
    name: string;
  };
  handoverDoctor?: {
    id: number;
    name: string;
  };
}

export interface GroupedHandovers {
  [date: string]: HandoverCaseNote[];
}

export interface HandoverVerificationRequest {
  verification_notes?: string;
}

export interface HandoverReceiptVerificationRequest {
  receipt_verification_notes?: string;
}

export const handoverApi = {
  // Get handovers that need verification by the requesting CA
  getHandoversNeedingVerification: async (): Promise<{ success: boolean; handovers?: GroupedHandovers; message?: string }> => {
    try {
      const response = await apiClient.get('/handovers/needing-verification');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching handovers needing verification:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch handovers needing verification'
      };
    }
  },

  // Get handovers that need acknowledgement by the receiving CA
  getHandoversNeedingAcknowledgement: async (): Promise<{ success: boolean; handovers?: GroupedHandovers; message?: string }> => {
    try {
      const response = await apiClient.get('/handovers/needing-acknowledgement');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching handovers needing acknowledgement:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch handovers needing acknowledgement'
      };
    }
  },

  // Verify handover received (by receiving CA)
  verifyHandoverReceived: async (handoverId: number, data: HandoverVerificationRequest): Promise<{ success: boolean; message?: string; handover?: HandoverCaseNote }> => {
    try {
      const response = await apiClient.post(`/handovers/${handoverId}/verify`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error verifying handover received:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to verify handover received'
      };
    }
  },

  // Verify handover receipt (by requesting CA)
  verifyHandoverReceipt: async (handoverId: number, data: HandoverReceiptVerificationRequest): Promise<{ success: boolean; message?: string; handover?: HandoverCaseNote }> => {
    try {
      const response = await apiClient.post(`/handovers/${handoverId}/verify-receipt`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error verifying handover receipt:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to verify handover receipt'
      };
    }
  },

  // Get handover history
  getHandoverHistory: async (): Promise<{ success: boolean; handovers?: HandoverCaseNote[]; message?: string }> => {
    try {
      const response = await apiClient.get('/handovers/history');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching handover history:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch handover history'
      };
    }
  },

  // Get handover statistics
  getHandoverStats: async (): Promise<{ success: boolean; stats?: any; message?: string }> => {
    try {
      const response = await apiClient.get('/handovers/stats');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching handover stats:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch handover stats'
      };
    }
  }
};
