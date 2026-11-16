import { api } from '../../lib/api';

export interface OperatingRoom { id: number; code: string; name: string; isActive: boolean }
export type SurgeryStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export interface SurgeryCase {
  id: number; caseNumber: string; patientId: number; patient: { firstName: string; middleName?: string | null; lastName?: string | null; mrdNumber: string };
  surgeonId: number; surgeon: { name: string }; roomId: number; room: OperatingRoom; procedure: string; plannedStart: string; plannedEnd: string;
  status: SurgeryStatus; startedAt: string | null; completedAt: string | null; outcomeNote: string | null; cancelReason: string | null;
}
export interface ScheduleSurgeryPayload { patientId: number; surgeonId: number; roomId: number; procedure: string; plannedStart: string; plannedEnd: string }
export type SurgeryAction = { action: 'start' } | { action: 'complete'; outcomeNote: string } | { action: 'cancel'; reason: string };
interface Envelope<T> { data: T }
export const surgeryApi = {
  rooms: async () => (await api.get<Envelope<OperatingRoom[]>>('/surgery/rooms')).data.data,
  cases: async () => (await api.get<Envelope<SurgeryCase[]>>('/surgery/cases')).data.data,
  schedule: async (payload: ScheduleSurgeryPayload) => (await api.post<Envelope<SurgeryCase>>('/surgery/cases', payload)).data.data,
  action: async (id: number, payload: SurgeryAction) => (await api.patch<Envelope<SurgeryCase>>(`/surgery/cases/${id}/action`, payload)).data.data,
};
