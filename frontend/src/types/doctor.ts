export interface Department {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
}

export interface Doctor {
  id: number;
  name: string;
  department_id: number;
  department?: Department;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorStatistics {
  total: number;
  active: number;
  inactive: number;
}

export interface DepartmentOption {
  value: number;
  label: string;
  code: string;
}

export interface DoctorFormData {
  name: string;
  department_id: number;
}
