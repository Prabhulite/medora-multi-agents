import { api } from '../../lib/api';

export type TriageCategory = 'red' | 'yellow' | 'green';
export type EmergencyStatus = 'waiting' | 'in_care' | 'admitted' | 'discharged';
export interface EmergencyCase {
  id: number; caseNumber: string; patientId: number; patient: { firstName: string; middleName?: string | null; lastName?: string | null; mrdNumber: string };
  triageCategory: TriageCategory; chiefComplaint: string; pulseBpm: number | null; systolicBp: number | null; diastolicBp: number | null; spo2Percent: number | null;
  status: EmergencyStatus; triagedAt: string; triagedBy?: { fullName: string } | null; dispositionAt: string | null; dispositionNote: string | null;
}
export interface CreateEmergencyCasePayload { patientId: number; triageCategory: TriageCategory; chiefComplaint: string; pulseBpm?: number; systolicBp?: number; diastolicBp?: number; spo2Percent?: number }
interface Envelope<T> { data: T }

export const emergencyApi = {
  list: async () => (await api.get<Envelope<EmergencyCase[]>>('/emergency/cases')).data.data,
  create: async (payload: CreateEmergencyCasePayload) => (await api.post<Envelope<EmergencyCase>>('/emergency/cases', payload)).data.data,
  updateStatus: async (id: number, status: 'in_care' | 'admitted' | 'discharged', dispositionNote?: string) => (await api.patch<Envelope<EmergencyCase>>(`/emergency/cases/${id}/status`, { status, dispositionNote })).data.data,
};
