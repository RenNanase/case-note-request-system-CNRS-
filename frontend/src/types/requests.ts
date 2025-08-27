// Request-related TypeScript types

export interface Patient {
  id: number;
  name: string;
  mrn: string;
  nric?: string | null;
  nationality_id?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  sex?: string | null;
  phone?: string | null;
  has_medical_alerts?: boolean;
  has_existing_requests?: boolean;
  is_available?: boolean;
  handover_status?: string;
  current_holder?: {
    id: number;
    name: string;
    email: string;
  };
  case_note_request_id?: number;
}

export interface Department {
  value: number;
  label: string;
  code: string;
}

export interface Doctor {
  value: number;
  label: string;
  department: string;
}

export interface Location {
  value: number;
  label: string;
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

export interface RequestEvent {
  id: number;
  type: string;
  type_label: string;
  description: string;
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
  requested_by_user_id: number;
  department_id: number;
  doctor_id?: number;
  location_id?: number;
  priority: string;
  status: string;
  purpose: string;
  remarks?: string;
  needed_date: string;
  approved_at?: string;
  approved_by_user_id?: number;
  approval_remarks?: string;
  completed_at?: string;
  completed_by_user_id?: number;
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

  // Rejection fields (when returned by CA)
  rejection_reason?: string;
  rejected_at?: string;
  rejected_by_user_id?: number;
  rejected_by?: {
    id: number;
    name: string;
    email: string;
  };

  // Handover fields
  current_pic_user_id?: number | null;
  handover_status?: 'none' | 'pending' | 'acknowledged' | 'completed';
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
}

export interface RequestFormData {
  patient_id: number;
  department_id: number;
  doctor_id?: number;
  location_id?: number;
  priority: string;
  purpose: string;
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
  handed_over_to_me?: number;
  my_handovers?: number;

  // MR Staff-specific stats
  total_requests?: number;
  pending_review?: number;
  in_progress_count?: number;
  completed_count?: number;

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
  stats: DashboardStats;
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
