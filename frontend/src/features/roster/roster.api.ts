import { api } from '../../lib/api';

interface Envelope<T> { data: T }
export interface RosterStaff { id: number; fullName: string; employeeId: string | null; designation: string | null }
export interface DutyShift { id: number; staffId: number; staff: RosterStaff; startsAt: string; endsAt: string; location: string; dutyRole: string; status: 'scheduled' | 'completed' | 'cancelled'; notes: string | null; closureNote: string | null; assignedBy?: { fullName: string } | null; closedBy?: { fullName: string } | null }
export interface CreateDutyShift { staffId: number; startsAt: string; endsAt: string; location: string; dutyRole: string; notes?: string | null }

export const rosterApi = {
  staff: async () => (await api.get<Envelope<RosterStaff[]>>('/roster/staff')).data.data,
  shifts: async (from: string, to: string, staffId?: number) => (await api.get<Envelope<DutyShift[]>>('/roster/shifts', { params: { from, to, ...(staffId ? { staffId } : {}) } })).data.data,
  create: async (payload: CreateDutyShift) => (await api.post<Envelope<DutyShift>>('/roster/shifts', payload)).data.data,
  close: async (id: number, status: 'completed' | 'cancelled', closureNote: string) => (await api.patch<Envelope<DutyShift>>(`/roster/shifts/${id}/close`, { status, closureNote })).data.data,
};
