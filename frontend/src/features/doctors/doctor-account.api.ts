import { api } from '../../lib/api';

interface Envelope<T> { data: T }
export interface AccountCandidate { id: number; username: string; fullName: string; employeeId: string | null; designation: string | null; isActive: boolean }
export interface AccountLinkEvent { id: number; fromUserId: number | null; toUserId: number | null; actorId: number; reason: string; createdAt: string }
export interface DoctorAccountLink { doctor: { id: number; doctorCode: string; name: string; medicalRegistrationNumber: string; isActive: boolean }; account: AccountCandidate | null; events: AccountLinkEvent[] }
export const doctorAccountApi = {
  get: async (id: number) => (await api.get<Envelope<DoctorAccountLink>>(`/doctors/${id}/account-link`)).data.data,
  candidates: async (search: string) => (await api.get<Envelope<AccountCandidate[]>>('/doctors/account-candidates', { params: { search } })).data.data,
  link: async (id: number, payload: { userId: number; doctorCode: string; reason: string }) => (await api.post<Envelope<DoctorAccountLink>>(`/doctors/${id}/account-link`, payload)).data.data,
  unlink: async (id: number, payload: { doctorCode: string; reason: string }) => (await api.post<Envelope<DoctorAccountLink>>(`/doctors/${id}/unlink-account`, payload)).data.data,
};
