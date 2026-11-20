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

export type ServiceCareType = 'OP' | 'IP' | 'Both';

export interface ServiceCategory {
  id: number;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  serviceCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceMaster {
  id: number;
  serviceCode: string;
  serviceName: string;
  categoryId: number;
  categoryCode: string | null;
  categoryName: string | null;
  departmentId: number;
  departmentCode: string | null;
  departmentName: string | null;
  serviceType: ServiceCareType;
  defaultPrice: number;
  taxPercent: number | null;
  description: string | null;
  isActive: boolean;
  billingApplicable: ServiceCareType;
  allowDiscount: boolean;
  defaultDiscountPercent: number | null;
  allowQuantity: boolean;
  defaultQuantity: number;
  effectiveFrom: string;
  branchName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServicePayload {
  serviceName: string;
  categoryId: number;
  departmentId: number;
  serviceType: ServiceCareType;
  defaultPrice: number;
  taxPercent?: number | null;
  description?: string | null;
  isActive?: boolean;
  billingApplicable?: ServiceCareType;
  allowDiscount?: boolean;
  defaultDiscountPercent?: number | null;
  allowQuantity?: boolean;
  defaultQuantity?: number;
  effectiveFrom: string;
  branchName?: string | null;
}

export type UpdateServicePayload = Partial<CreateServicePayload>;

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

export type PatientGender = 'male' | 'female' | 'transgender' | 'other';
export type PatientCategory =
  | 'general'
  | 'corporate'
  | 'insurance'
  | 'government_scheme'
  | 'staff'
  | 'vip';
export type IdProofType = 'aadhaar' | 'passport' | 'voter_id' | 'driving_licence' | 'other';
export type EmergencyRelationship =
  | 'father'
  | 'mother'
  | 'husband'
  | 'wife'
  | 'son'
  | 'daughter'
  | 'brother'
  | 'sister'
  | 'guardian'
  | 'other';

export interface Patient {
  id: number;
  mrdNumber: string;
  familyId?: string | null;
  registrationAt: string;
  fullName: string;
  gender: PatientGender;
  dateOfBirth: string | null;
  ageYears: number | null;
  ageIsApproximate: boolean;
  bloodGroup: string | null;
  photoData: string | null;
  mobileNumber: string | null;
  city: string | null;
  addressLine: string | null;
  district: string | null;
  state: string | null;
  patientCategory: PatientCategory | null;
  latestVisitNumber: string | null;
  latestOpNumber: string | null;
  latestVisitAt: string | null;
  latestVisitDepartmentId: number | null;
  mergedIntoPatientId: number | null;
  createdById: number | null;
  createdByName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  title?: string | null;
  firstName?: string;
  middleName?: string | null;
  lastName?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  religion?: string | null;
  occupation?: string | null;
  referredBy?: string | null;
  registrationSourceId?: number | null;
  registrationSourceName?: string | null;
  referralDoctorId?: number | null;
  referralDoctorName?: string | null;
  preferredLanguage?: string | null;
  specialRemarks?: string | null;
  contact?: {
    mobileNumber: string;
    alternateMobile: string | null;
    email: string | null;
  } | null;
  address?: {
    addressLine1: string;
    addressLine2: string | null;
    country: string;
    state: string;
    district: string;
    city: string;
    pincode: string;
  } | null;
  identification?: {
    idProofType: IdProofType | null;
    idProofNumber: string | null;
    idProofDocumentName: string | null;
    idProofDocumentFileName: string | null;
    idProofDocumentMimeType: string | null;
    idProofDocumentData: string | null;
    abhaNumber: string | null;
    abhaAddress: string | null;
  } | null;
  emergencyContact?: {
    contactPersonName: string | null;
    relationship: EmergencyRelationship | null;
    contactNumber: string | null;
    alternateNumber: string | null;
    address: string | null;
  } | null;
  visits?: Array<{
    id: number;
    visitNumber: string;
    opNumber: string | null;
    visitType: string;
    visitAt: string;
    status: string;
  }>;
  updatedById?: number | null;
  updatedByName?: string | null;
}

export interface UpsertPatientPayload {
  title?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  gender: PatientGender;
  dateOfBirth?: string | null;
  ageYears?: number | null;
  ageIsApproximate?: boolean;
  bloodGroup?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  religion?: string | null;
  photoData?: string | null;
  occupation?: string | null;
  patientCategory?: PatientCategory | null;
  referredBy?: string | null;
  registrationSourceId?: number | null;
  referralDoctorId?: number | null;
  preferredLanguage?: string | null;
  specialRemarks?: string | null;
  isActive?: boolean;
  createVisit?: boolean;
  contact: {
    mobileNumber: string;
    alternateMobile?: string | null;
    email?: string | null;
  };
  address?: {
    addressLine1: string;
    addressLine2?: string | null;
    country: string;
    state: string;
    district: string;
    city: string;
    pincode: string;
  };
  identification?: {
    idProofType?: IdProofType | null;
    idProofNumber?: string | null;
    idProofDocument?: MasterDocument | null;
    abhaNumber?: string | null;
    abhaAddress?: string | null;
  } | null;
  emergencyContact?: {
    contactPersonName?: string | null;
    relationship?: EmergencyRelationship | null;
    contactNumber?: string | null;
    alternateNumber?: string | null;
    address?: string | null;
  } | null;
}

export interface PatientAuditLog {
  id: number;
  action: string;
  changeSummary: string | null;
  changedByName: string | null;
  sourceMrdNumber: string | null;
  createdAt: string;
}

export interface ClinicalEncounter {
  id: number;
  revision: number;
  patientId: number;
  visitId: number | null;
  doctorId: number | null;
  encounterType: string;
  status: 'draft' | 'signed' | 'amended';
  signedAt: string | null;
  signedById: number | null;
  signedBy?: { fullName: string } | null;
  addenda?: Array<{ id: number; reason: string; addendum: string; createdAt: string; createdBy?: { fullName: string } | null }>;
  complaints: string | null;
  examination: string | null;
  assessment: string | null;
  plan: string | null;
  diagnosisCode: string | null;
  diagnosisSystem: string | null;
  diagnosisTermId: number | null;
  diagnosisVersion: string | null;
  diagnosisName: string | null;
  vitals: Record<string, string | number | null> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClinicalEncounterPayload {
  patientId: number;
  visitId?: number | null;
  doctorId?: number | null;
  encounterType?: string;
  complaints?: string | null;
  examination?: string | null;
  assessment?: string | null;
  plan?: string | null;
  diagnosisCode?: string | null;
  diagnosisName?: string | null;
  diagnosisTermId?: number | null;
  vitals?: Record<string, string | number | null> | null;
}

export interface UpdateClinicalEncounterPayload {
  expectedRevision: number;
  complaints?: string | null;
  examination?: string | null;
  assessment?: string | null;
  plan?: string | null;
  diagnosisTermId?: number | null;
  diagnosisName?: string | null;
  vitals?: Record<string, string | number | null> | null;
}

export interface Prescription {
  prescriberName?: string | null;
  prescriberRegistration?: string | null;
  id: number;
  patientId: number;
  encounterId: number | null;
  medicationId: number | null;
  medicineName: string;
  dosage: string | null;
  frequency: string | null;
  durationDays: number | null;
  quantityPrescribed: number | null;
  route: string;
  instructions: string | null;
  status: 'active' | 'stopped' | 'completed';
  createdAt: string;
}

export interface CreatePrescriptionPayload {
  patientId: number;
  encounterId?: number | null;
  medicineName: string;
  medicationId?: number | null;
  quantityPrescribed?: number | null;
  dosage?: string | null;
  frequency?: string | null;
  durationDays?: number | null;
  route?: string;
  instructions?: string | null;
}

export type AppointmentType = 'new_consultation' | 'follow_up' | 'review';
export type AppointmentStatus =
  | 'booked'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

export interface AppointmentStatusHistoryItem {
  id: number;
  fromStatus: AppointmentStatus | null;
  toStatus: AppointmentStatus;
  notes: string | null;
  changedById: number | null;
  changedByName: string | null;
  createdAt: string;
}

export interface Appointment {
  id: number;
  appointmentNumber: string;
  patientId: number;
  patientMrdNumber: string | null;
  patientName: string;
  patientAgeYears: number | null;
  patientGender: PatientGender | null;
  patientMobile: string | null;
  doctorId: number;
  doctorName: string | null;
  departmentId: number;
  departmentName: string | null;
  appointmentDate: string;
  appointmentTime: string | null;
  appointmentType: AppointmentType;
  reason: string | null;
  remarks: string | null;
  status: AppointmentStatus;
  visitId: number | null;
  visitNumber: string | null;
  opNumber: string | null;
  createdById: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory?: AppointmentStatusHistoryItem[];
}

export interface RegistrationSource {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export interface RegistrationSourceEvent {
  id: number;
  action: 'created' | 'renamed' | 'retired' | 'reactivated' | 'updated';
  beforeName: string | null;
  afterName: string;
  beforeActive: boolean | null;
  afterActive: boolean;
  actorName: string | null;
  createdAt: string;
}

export interface RegistrationSourceReport {
  from: string;
  to: string;
  total: number;
  unassigned: number;
  rows: Array<{ sourceId: number | null; code: string | null; name: string; isActive: boolean; count: number }>;
}

export interface AppointmentSlot {
  time: string;
  available: boolean;
}

export interface AppointmentSlotsResponse {
  doctorId: number;
  date: string;
  slots: AppointmentSlot[];
  message: string | null;
}

export interface AvailableDoctor {
  id: number;
  doctorCode: string;
  name: string;
  departmentId: number;
  departmentName: string | null;
  consultationDurationMinutes: number;
}

export interface CreateAppointmentPayload {
  patientId: number;
  doctorId: number;
  departmentId: number;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: AppointmentType;
  reason?: string | null;
  remarks?: string | null;
  forceDuplicate?: boolean;
}

export interface UpdateAppointmentStatusPayload {
  status: AppointmentStatus;
  notes?: string | null;
  appointmentDate?: string;
  appointmentTime?: string;
  doctorId?: number;
  departmentId?: number;
}

export interface OpCheckinVisit {
  id: number;
  visitNumber: string;
  opNumber: string | null;
  patientId: number;
  patientName: string;
  patientMrdNumber: string | null;
  patientFamilyId: string | null;
  patientMobile: string | null;
  patientPhotoData: string | null;
  doctorId: number | null;
  doctorName: string | null;
  doctorQualification: string | null;
  departmentId: number | null;
  departmentName: string | null;
  natureOfVisit: string | null;
  purposeOfVisit: string | null;
  referredBy: string | null;
  appointmentId: number | null;
  appointmentNumber: string | null;
  isMlc: boolean;
  hadFood: boolean;
  tokenNumber: number | null;
  checkedInAt: string;
  checkedInByName: string | null;
  checkedOutAt: string | null;
  checkedOutByName: string | null;
  consultationStartedAt: string | null;
  consultationStartedByName: string | null;
  visitDuration: string;
  visitState: 'inside' | 'done';
  status: 'registered' | 'in_progress' | 'consulting' | 'completed' | 'cancelled';
  billAmount: number | null;
  nextAppointmentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpCheckinAppointmentOption {
  id: number;
  appointmentNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  doctorId: number;
  doctorName: string | null;
  status: string;
  reason: string | null;
}

export interface CreateOpCheckinPayload {
  patientId: number;
  doctorId: number;
  natureOfVisit: string;
  purposeOfVisit: string;
  referredBy?: string | null;
  appointmentId?: number | null;
  isMlc?: boolean;
  hadFood?: boolean;
  makeNewCheckin?: boolean;
  familyId?: string | null;
}
