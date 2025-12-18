// Request-related TypeScript types

export interface Patient {
  id: number;
  name: string;
  mrn: string;
  date_of_birth?: string | null;
  gender?: string;
  nric?: string | null;
  nationality_id?: string | null;
  phone?: string | null;
  has_medical_alerts?: boolean;
  has_existing_requests?: boolean;
  is_available?: boolean;
  handover_status?: string;
  availability_reason?: 'pending_return_verification' | 'handover_requested' | 'held_by_other_ca' | string;
  restriction_type?: string;
  restriction_details?: {
    department_name: string;
    location_name: string;
    doctor_name: string;
    user_type_label: string;
    remarks: string;
    opened_by_name: string;
    opened_at: string;
  };
  current_holder?: {
    id: number;
    name: string;
    email: string;
  };
  case_note_request_id?: number;
  current_case_note?: {
    department?: {
      id: number;
      name: string;
    };
    location?: {
      id: number;
      name: string;
    };
    doctor?: {
      id: number;
      name: string;
    };
  };
}

export interface Department {
  id: number;
  name: string;
  code: string;
}

export interface Doctor {
  id: number;
  name: string;
  // Doctors are now independent of departments
  is_active?: boolean;
}

export interface Location {
  id: number;
  name: string;
  type: string;
}

export interface Priority {
  value: string;
  label: string;
}

export interface Status {
  value: string;
  label: string;
}

export interface RequestEventUser {
  id: number;
  name: string;
}

export interface RequestEvent {
  id: number;
  type: string;
  type_label: string;
  description: string;
  created_at: string;
  user?: RequestEventUser;
  actor: string;
  location?: string;
  person?: string;
  reason?: string;
  occurred_at: string;
  occurred_at_human: string;
  metadata?: Record<string, any>;
}

export interface CaseNoteRequest {
  id: number;
  request_number: string;
  patient_id: number;
  notes?: string;
  status: string;
  created_at: string;
  patient?: Patient;
  requested_by_user_id: number;
  department_id: number;
  doctor_id?: number;
  location_id?: number;
  priority: string;
  purpose: string;
  remarks?: string;
  needed_date: string;
  approved_at?: string;
  approved_by_user_id?: number;
  approval_remarks?: string;
  completed_at?: string;
  completed_by_user_id?: number;
  is_received?: boolean;
  received_at?: string;
  received_by_user_id?: number;
  created_at: string;
  updated_at: string;

  // Relationships
  patient?: Patient;
  requested_by?: {
    id: number;
    name: string;
    email: string;
  };
  department?: {
    id: number;
    name: string;
    code: string;
  };
  doctor?: {
    id: number;
    name: string;
  };
  location?: {
    id: number;
    name: string;
    type: string;
  };
  approved_by?: {
    id: number;
    name: string;

  };
  completed_by?: {
    id: number;
    name: string;
    email: string;
  };

  // Send out related properties
  is_Acknowledge?: boolean;
  department_name?: string;
  doctor_name?: string;
  send_out_number?: string;
  sent_at?: string;
  patient_name?: string;
  patient_mrn?: string;

  // Rejection fields (when returned by CA)
  rejection_reason?: string;
  rejected_at?: string;
  rejected_by_user_id?: number;
  rejected_by?: {
    id: number;
    name: string;
    email: string;
  };

  // Return fields
  is_returned?: boolean;
  returned_at?: string;
  returned_by_user_id?: number;
  returned_by?: {
    id: number;
    name: string;
    email: string;
  };
  return_notes?: string;
  is_rejected_return?: boolean;

  // Handover fields
  current_pic_user_id?: number | null;
  handover_status?: 'none' | 'pending' | 'Acknowledge' | 'completed' | 'approved_pending_verification' | 'verified' | 'rejected';
  current_pic?: {
    id: number;
    name: string;
    email: string;
  };

  // Computed attributes
  status_label: string;
  priority_label: string;
  is_overdue: boolean;
  can_be_approved: boolean;
  can_be_completed: boolean;
  days_to_complete?: number;

  // Waiting for Approval status (for pending handover requests)
  display_status?: string;
  is_waiting_for_approval?: boolean;

  // Pending return status (for case notes submitted for return but waiting for MR staff verification)
  is_pending_return?: boolean;
}

export interface RequestFormData {
  patient_id: number;
  department_id: number;
  doctor_id?: number;
  location_id?: number;
  priority?: string;
  purpose?: string;
  needed_date: string;
  remarks?: string;
}

export interface RequestsListParams {
  page?: number;
  per_page?: number;
  status?: string;
  priority?: string;
  department_id?: number;
  search?: string;
  overdue?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  include_all_involvement?: boolean;
}

export interface RequestsListResponse {
  success: boolean;
  requests: {
    data: CaseNoteRequest[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

export interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  in_progress: number;
  completed: number;
  overdue: number;

  // CA-specific stats
  my_requests?: number;
  my_pending?: number;
  my_completed?: number;
  my_rejected?: number;
  pending_verifications?: number;
  pending_handover_verifications?: number;
  handed_over_to_me?: number;
  my_handovers?: number;
  total_handovers?: number;
  pending_handovers?: number;
  completed_handovers?: number;
  active_case_notes?: number;

  // MR Staff-specific stats
  total_requests?: number;
  pending_review?: number;
  in_progress_count?: number;
  completed_count?: number;
  not_returned_count?: number;
  rejected_count?: number;

  // Admin-specific stats
  total_users?: number;
  system_health?: string;
  active_sessions?: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PatientSearchResponse {
  success: boolean;
  patients: Patient[];
}

export interface DepartmentsResponse {
  success: boolean;
  departments: Department[];
}

export interface DoctorsResponse {
  success: boolean;
  doctors: Doctor[];
}

export interface LocationsResponse {
  success: boolean;
  locations: Location[];
}

export interface PrioritiesResponse {
  success: boolean;
  priorities: Priority[];
}

export interface StatusesResponse {
  success: boolean;
  statuses: Status[];
}

export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
  execution_time_ms?: number;
  cached?: boolean;
}

export interface RequestDetailsResponse {
  success: boolean;
  request: CaseNoteRequest;
  timeline: RequestEvent[];
}

export interface CreateRequestResponse {
  success: boolean;
  message: string;
  request: CaseNoteRequest;
}

export interface VerificationSubmission {
  case_note_ids: number[];
  verification_notes?: string;
}

export interface RejectionSubmission {
  case_note_ids: number[];
  rejection_reason: string;
}
