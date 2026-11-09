export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  roleIds: number[];
  roleCodes: string[];
  permissions: string[];
  isSuperAdmin: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  code?: string;
  details?: unknown;
}

export type UserGender = 'male' | 'female' | 'other' | null;

export interface Department {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
}

export interface CreateDepartmentPayload {
  code: string;
  name: string;
  isActive: boolean;
}

export interface UpdateDepartmentPayload {
  code?: string;
  name?: string;
  isActive?: boolean;
}

export type HospitalType = 'multi_speciality' | 'ivf' | 'general' | 'clinic';

export interface MasterDocument {
  id?: number;
  name: string;
  fileName: string;
  mimeType?: string | null;
  fileData: string;
  createdAt?: string;
}

export interface HospitalProfile {
  id: number;
  hospitalName: string;
  hospitalCode: string;
  hospitalType: HospitalType | null;
  registrationNumber: string | null;
  gstNumber: string | null;
  contactNumber: string | null;
  email: string | null;
  address: string | null;
  country: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  pincode: string | null;
  logoData: string | null;
  website: string | null;
  timeZone: string | null;
  currency: string | null;
  dateFormat: string | null;
  financialYear: string | null;
  documents?: MasterDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertHospitalProfilePayload {
  hospitalName: string;
  hospitalCode: string;
  hospitalType?: HospitalType | null;
  registrationNumber?: string | null;
  gstNumber?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  address?: string | null;
  country?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  pincode?: string | null;
  logoData?: string | null;
  website?: string | null;
  timeZone?: string | null;
  currency?: string | null;
  dateFormat?: string | null;
  financialYear?: string | null;
  documents?: MasterDocument[];
}

export interface Specialization {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  doctorCount?: number;
}

export interface CreateSpecializationPayload {
  code: string;
  name: string;
  isActive: boolean;
}

export interface UpdateSpecializationPayload {
  code?: string;
  name?: string;
  isActive?: boolean;
}

export type DoctorGender = 'male' | 'female' | 'other';
export type DoctorDesignation = 'consultant' | 'senior_consultant' | 'visiting_consultant';
export type DoctorType = 'in_house' | 'visiting';
export type DoctorLeaveStatus = 'scheduled' | 'cancelled' | 'completed';

export interface DoctorFees {
  newConsultationFee: number | null;
  followUpConsultationFee: number | null;
  emergencyConsultationFee: number | null;
}

export interface DoctorScheduleItem {
  dayOfWeek: number;
  isAvailable: boolean;
  morningStart: string | null;
  morningEnd: string | null;
  eveningStart: string | null;
  eveningEnd: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  maxPatientsPerSession: number | null;
}

export interface DoctorLeaveItem {
  id?: number;
  leaveFrom: string;
  leaveTo: string;
  reason: string | null;
  status: DoctorLeaveStatus;
}

export interface Doctor {
  id: number;
  doctorCode: string;
  name: string;
  mobileNumber: string;
  email: string | null;
  qualification: string;
  specializationId: number;
  specializationName: string | null;
  departmentId: number;
  departmentName: string | null;
  designation: DoctorDesignation | null;
  doctorType: DoctorType | null;
  isActive: boolean;
  documentCount?: number;
  createdAt: string;
  updatedAt: string;
  gender?: DoctorGender | null;
  dob?: string | null;
  address?: string | null;
  photoData?: string | null;
  medicalRegistrationNumber?: string;
  experienceYears?: number | null;
  reviewValidityDays?: number | null;
  consultationDurationMinutes?: number | null;
  walkInAllowed?: boolean;
  appointmentRequired?: boolean;
  consultationRoom?: string | null;
  joiningDate?: string | null;
  fees?: DoctorFees;
  schedules?: DoctorScheduleItem[];
  leaves?: DoctorLeaveItem[];
  documents?: MasterDocument[];
}

export interface UpsertDoctorPayload {
  name: string;
  gender?: DoctorGender | null;
  dob?: string | null;
  mobileNumber: string;
  email?: string | null;
  address?: string | null;
  photoData?: string | null;
  qualification: string;
  specializationId: number;
  departmentId: number;
  medicalRegistrationNumber: string;
  experienceYears?: number | null;
  designation?: DoctorDesignation | null;
  reviewValidityDays?: number | null;
  consultationDurationMinutes?: number | null;
  walkInAllowed?: boolean;
  appointmentRequired?: boolean;
  consultationRoom?: string | null;
  doctorType?: DoctorType | null;
  joiningDate?: string | null;
  isActive?: boolean;
  fees?: {
    newConsultationFee?: number | null;
    followUpConsultationFee?: number | null;
    emergencyConsultationFee?: number | null;
  };
  schedule?: {
    availableDays: number[];
    morningStart?: string | null;
    morningEnd?: string | null;
    eveningStart?: string | null;
    eveningEnd?: string | null;
    breakStart?: string | null;
    breakEnd?: string | null;
    maxPatientsPerSession?: number | null;
  };
  leaves?: Array<{
    leaveFrom: string;
    leaveTo: string;
    reason?: string | null;
    status?: DoctorLeaveStatus;
  }>;
  documents?: MasterDocument[];
}

export interface User {
  id: number;
  employeeId: string | null;
  username: string;
  email: string | null;
  fullName: string;
  mobileNumber: string | null;
  gender: UserGender;
  designation: string | null;
  departmentId: number | null;
  departmentName: string | null;
  departmentCode: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  lastLoginAt: string | null;
  createdById: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  roleIds: number[];
  roleCodes: string[];
  roleNames: string[];
}

export interface Role {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdById: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  permissionIds: number[];
  permissionCodes: string[];
}

export interface Permission {
  id: number;
  code: string;
  module: string;
  action: string;
  description: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface CreateUserPayload {
  employeeId: string;
  fullName: string;
  mobileNumber: string;
  email?: string | null;
  gender?: UserGender;
  designation?: string | null;
  departmentId: number;
  username: string;
  password: string;
  isActive: boolean;
  roleIds: number[];
}

export interface UpdateUserPayload {
  employeeId?: string;
  fullName?: string;
  mobileNumber?: string;
  email?: string | null;
  gender?: UserGender;
  designation?: string | null;
  departmentId?: number | null;
  password?: string;
  isActive?: boolean;
  roleIds?: number[];
}

export interface CreateRolePayload {
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  permissionIds: number[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  permissionIds?: number[];
}

export interface MenuItem {
  id: number;
  code: string;
  label: string;
  route: string;
  icon: string;
  permissionCode: string | null;
  parentId: number | null;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMenuPayload {
  code: string;
  label: string;
  route: string;
  icon: string;
  permissionCode?: string | null;
  parentId?: number | null;
  sortOrder: number;
  isActive: boolean;
}

export interface UpdateMenuPayload {
  label?: string;
  route?: string;
  icon?: string;
  permissionCode?: string | null;
  parentId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}
