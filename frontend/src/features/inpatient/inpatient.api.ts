import { api } from '../../lib/api';

export interface Ward {
  id: number;
  name: string;
  code: string;
  floor: string | null;
  specialty: string | null;
  totalBeds: number;
  occupiedBeds: number;
  status: 'active' | 'inactive';
}

export type BedStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';

export interface Bed {
  id: number;
  bedNumber: string;
  wardId: number;
  wardName: string;
  roomNumber: string | null;
  bedType: 'general' | 'semi_private' | 'private' | 'icu' | 'isolation';
  status: BedStatus;
  patientName: string | null;
  patientMrdNumber: string | null;
}

export type AdmissionStatus = 'planned' | 'admitted' | 'transferred' | 'discharged' | 'cancelled';

export interface Admission {
  id: number;
  admissionNumber: string;
  patientId: number;
  patientName: string;
  patientMrdNumber: string;
  wardId: number;
  wardName: string;
  bedId: number;
  bedNumber: string;
  attendingDoctor: string;
  admissionType: 'elective' | 'emergency' | 'day_care';
  admittedAt: string;
  dischargedAt: string | null;
  expectedDischargeAt: string | null;
  status: AdmissionStatus;
  diagnosis: string | null;
  dischargeSummary: string | null;
  dischargeDiagnosis: string | null;
  dischargeMedications: string | null;
  medicationsReviewedAt?: string | null;
  followUpInstructions: string | null;
}

export interface DischargePayload {
  dischargeSummary: string;
  dischargeDiagnosis?: string | null;
  dischargeMedications?: string | null;
  medicationsReviewed: true;
  medicationReview: ({ prescriptionId: number; decision: 'continue'; instructions: string } | { prescriptionId: number; decision: 'stop'; reason: string })[];
  homeMedicationsReviewed: true;
  homeMedicationReview: ({ homeMedicationId: number; decision: 'continue'; instructions: string; changeReason?: string } | { homeMedicationId: number; decision: 'stop'; reason: string })[];
  followUpInstructions?: string | null;
}
export interface NursingObservation { id: number; observedAt: string; temperatureC: string | null; pulseBpm: number | null; systolicBp: number | null; diastolicBp: number | null; spo2Percent: number | null; notes: string | null; recordedBy?: { fullName: string } | null }
export interface NursingObservationPayload { temperatureC?: number; pulseBpm?: number; systolicBp?: number; diastolicBp?: number; spo2Percent?: number; notes?: string }
export interface NursingCarePlan { id: number; problem: string; goal: string; interventions: string; reviewAt: string | null; status: 'active' | 'completed' | 'discontinued'; reviewNote: string | null; closedAt: string | null; createdAt: string; createdBy?: { fullName: string } | null; closedBy?: { fullName: string } | null }
export interface NursingCarePlanPayload { problem: string; goal: string; interventions: string; reviewAt?: string | null }
export interface BedTransfer { id: number; fromBed: { number: string; ward: { name: string } }; toBed: { number: string; ward: { name: string } }; reason: string; transferredAt: string; transferredBy?: { fullName: string } | null }
export interface MedicationOrder { id: number; medicineName: string; dosage: string | null; frequency: string | null; route: string; status: string }
export interface MedicationAdministration { id: number; prescriptionId: number; prescription: MedicationOrder; outcome: 'given' | 'withheld' | 'refused'; doseGiven: string | null; route: string | null; notes: string | null; recordedAt: string; administeredBy?: { fullName: string } | null }
export interface DischargeMedicationReview { medicationsReviewedAt: string | null; medicationsReviewedById: number | null; items: { id: number; prescriptionId: number; medicineName: string; dosage: string | null; frequency: string | null; route: string; decision: 'continue' | 'stop'; instructions: string | null; reason: string | null; reviewedAt: string; reviewedBy: { id: number; fullName: string } | null }[]; homeItems: { id: number; homeMedicationId: number; medicineName: string; dosage: string | null; frequency: string | null; route: string | null; source: string; sourceDetail: string | null; decision: 'continue' | 'stop'; instructions: string | null; reason: string | null; changeReason: string | null; reviewedAt: string; reviewedBy: { id: number; fullName: string } | null }[] }
export interface MedicationAdministrationPayload { prescriptionId: number; outcome: MedicationAdministration['outcome']; doseGiven?: string; route?: string; notes?: string }
export type AdmissionHomeMedicationDecision = 'continue' | 'hold' | 'stop';
export interface AdmissionMedicationReview {
  reviewedAt: string | null;
  reviewedById: number | null;
  items: { id: number; homeMedicationId: number; medicineName: string; dosage: string | null; frequency: string | null; route: string | null; source: string; sourceDetail: string | null; decision: AdmissionHomeMedicationDecision; reason: string | null; reviewedAt: string; reviewedById: number | null }[];
}
export interface AdmissionMedicationReviewPayload {
  homeMedicationsReviewed: true;
  homeMedicationReview: { homeMedicationId: number; decision: AdmissionHomeMedicationDecision; reason?: string }[];
}

export interface CreateAdmissionPayload {
  patientId: number;
  bedId: number;
  doctorId?: number | null;
  diagnosis?: string | null;
  notes?: string | null;
}

interface ApiEnvelope<T> {
  data: T;
}

async function getOrFallback<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await api.get<ApiEnvelope<T>>(path);
    return response.data.data;
  } catch {
    return fallback;
  }
}

function mapWard(row: any): Ward {
  if ('totalBeds' in row) return row as Ward;
  const beds = Array.isArray(row.beds) ? row.beds : [];
  return { id: row.id, name: row.name, code: row.code, floor: row.floor != null ? `Floor ${row.floor}` : null, specialty: row.wardType || null, totalBeds: beds.length, occupiedBeds: beds.filter((bed: any) => bed.status === 'occupied').length, status: row.isActive ? 'active' : 'inactive' };
}

function mapBed(row: any): Bed {
  if ('bedNumber' in row) return row as Bed;
  return { id: row.id, bedNumber: row.number, wardId: row.wardId, wardName: row.ward?.name || 'Unknown ward', roomNumber: null, bedType: row.ward?.wardType === 'icu' ? 'icu' : 'general', status: row.status, patientName: null, patientMrdNumber: null };
}

function mapAdmission(row: any): Admission {
  if ('admissionNumber' in row && 'patientName' in row) return row as Admission;
  return { id: row.id, admissionNumber: row.admissionNumber, patientId: row.patientId, patientName: row.patient?.fullName || [row.patient?.firstName, row.patient?.middleName, row.patient?.lastName].filter(Boolean).join(' ') || 'Patient', patientMrdNumber: row.patient?.mrdNumber || '', wardId: row.bed?.wardId || 0, wardName: row.bed?.ward?.name || 'Unknown ward', bedId: row.bedId, bedNumber: row.bed?.number || '', attendingDoctor: row.doctor?.name || 'Not assigned', admissionType: 'elective', admittedAt: row.admittedAt, dischargedAt: row.dischargedAt ?? null, expectedDischargeAt: null, status: row.status, diagnosis: row.reason || null, dischargeSummary: row.dischargeSummary ?? null, dischargeDiagnosis: row.dischargeDiagnosis ?? null, dischargeMedications: row.dischargeMedications ?? null, followUpInstructions: row.followUpInstructions ?? null };
}

export const inpatientApi = {
  listWards: async () => (await getOrFallback<any[]>('/inpatient/wards', [])).map(mapWard),
  listBeds: async () => (await getOrFallback<any[]>('/inpatient/beds', [])).map(mapBed),
  listAdmissions: async () => (await getOrFallback<any[]>('/inpatient/admissions', [])).map(mapAdmission),
  createAdmission: async (payload: CreateAdmissionPayload) => {
    const response = await api.post<ApiEnvelope<any>>('/inpatient/admissions', { patientId: payload.patientId, bedId: payload.bedId, doctorId: payload.doctorId || null, reason: payload.diagnosis || null, notes: payload.notes || null });
    return mapAdmission(response.data.data);
  },
  discharge: async (id: number, payload: DischargePayload) => {
    const response = await api.patch<ApiEnvelope<any>>(`/inpatient/admissions/${id}/discharge`, payload);
    return mapAdmission(response.data.data);
  },
  listObservations: async (id: number) => (await api.get<ApiEnvelope<NursingObservation[]>>(`/inpatient/admissions/${id}/observations`)).data.data,
  listCarePlans: async (id: number) => (await api.get<ApiEnvelope<NursingCarePlan[]>>(`/inpatient/admissions/${id}/care-plans`)).data.data,
  addCarePlan: async (id: number, payload: NursingCarePlanPayload) => (await api.post<ApiEnvelope<NursingCarePlan>>(`/inpatient/admissions/${id}/care-plans`, payload)).data.data,
  closeCarePlan: async (id: number, planId: number, status: 'completed' | 'discontinued', reviewNote: string) => (await api.patch<ApiEnvelope<NursingCarePlan>>(`/inpatient/admissions/${id}/care-plans/${planId}/close`, { status, reviewNote })).data.data,
  addObservation: async (id: number, payload: NursingObservationPayload) => (await api.post<ApiEnvelope<NursingObservation>>(`/inpatient/admissions/${id}/observations`, payload)).data.data,
  listTransfers: async (id: number) => (await api.get<ApiEnvelope<BedTransfer[]>>(`/inpatient/admissions/${id}/transfers`)).data.data,
  transfer: async (id: number, toBedId: number, reason: string) => (await api.post<ApiEnvelope<BedTransfer>>(`/inpatient/admissions/${id}/transfers`, { toBedId, reason })).data.data,
  medicationOrders: async (id: number) => (await api.get<ApiEnvelope<MedicationOrder[]>>(`/inpatient/admissions/${id}/medication-orders`)).data.data,
  dischargeMedicationReview: async (id: number) => (await api.get<ApiEnvelope<DischargeMedicationReview>>(`/inpatient/admissions/${id}/discharge-medication-review`)).data.data,
  admissionMedicationReview: async (id: number) => (await api.get<ApiEnvelope<AdmissionMedicationReview | null>>(`/inpatient/admissions/${id}/admission-medication-review`)).data.data,
  saveAdmissionMedicationReview: async (id: number, payload: AdmissionMedicationReviewPayload) => (await api.post<ApiEnvelope<AdmissionMedicationReview>>(`/inpatient/admissions/${id}/admission-medication-review`, payload)).data.data,
  medicationAdministrations: async (id: number) => (await api.get<ApiEnvelope<MedicationAdministration[]>>(`/inpatient/admissions/${id}/medication-administrations`)).data.data,
  addMedicationAdministration: async (id: number, payload: MedicationAdministrationPayload) => (await api.post<ApiEnvelope<MedicationAdministration>>(`/inpatient/admissions/${id}/medication-administrations`, payload)).data.data,
};
