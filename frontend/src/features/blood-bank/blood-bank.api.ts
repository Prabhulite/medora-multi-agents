import { api } from '../../lib/api';

interface Envelope<T> { data: T }
export type UnitStatus = 'quarantined' | 'available' | 'issued' | 'discarded';
export interface BloodUnit { id: number; unitNumber: string; component: string; bloodGroup: string; collectedOn: string; expiresOn: string; storageLocation: string; status: UnitStatus; screeningReference: string | null; issuedPatientId: number | null; crossmatchReference: string | null; expired: boolean }
export interface BloodUnitEvent { id: number; fromStatus: UnitStatus | null; toStatus: UnitStatus; reference: string | null; actorId: number; createdAt: string }
export interface ReceiveUnit { unitNumber: string; component: string; bloodGroup: string; collectedOn: string; expiresOn: string; storageLocation: string }
export interface IssuePatient { id: number; mrdNumber: string; fullName: string }
export const bloodBankApi = {
  units: async (status?: UnitStatus, search?: string, beforeId?: number) => (await api.get<Envelope<{ items: BloodUnit[]; nextCursor: number | null }>>('/blood-bank/units', { params: { status, search, beforeId } })).data.data,
  events: async (id: number) => (await api.get<Envelope<BloodUnitEvent[]>>(`/blood-bank/units/${id}/events`)).data.data,
  patients: async (search: string) => (await api.get<Envelope<IssuePatient[]>>('/blood-bank/patients', { params: { search } })).data.data,
  receive: async (payload: ReceiveUnit) => (await api.post<Envelope<BloodUnit>>('/blood-bank/units', payload)).data.data,
  release: async (id: number, screeningReference: string) => (await api.post<Envelope<BloodUnit>>(`/blood-bank/units/${id}/release`, { screeningReference, screeningCleared: true })).data.data,
  issue: async (id: number, patientId: number, crossmatchReference: string) => (await api.post<Envelope<BloodUnit>>(`/blood-bank/units/${id}/issue`, { patientId, crossmatchReference })).data.data,
  discard: async (id: number, reason: string) => (await api.post<Envelope<BloodUnit>>(`/blood-bank/units/${id}/discard`, { reason })).data.data,
};
