import { api } from '../../lib/api';
import type {
  ApiResponse,
  CreateOpCheckinPayload,
  OpCheckinAppointmentOption,
  OpCheckinVisit,
} from '../../types';

export const checkinApi = {
  list: async (params?: {
    date?: string;
    fromDate?: string;
    toDate?: string;
    doctorId?: number;
    patientId?: number;
    status?: 'inside' | 'done' | 'waiting' | 'consulting' | 'all';
  }) => {
    const { data } = await api.get<ApiResponse<OpCheckinVisit[]>>('/visits', { params });
    return data.data;
  },
  patientAppointments: async (patientId: number) => {
    const { data } = await api.get<ApiResponse<OpCheckinAppointmentOption[]>>(
      `/visits/patients/${patientId}/appointments`,
    );
    return data.data;
  },
  checkin: async (payload: CreateOpCheckinPayload) => {
    const { data } = await api.post<ApiResponse<OpCheckinVisit>>('/visits/checkin', payload);
    return data.data;
  },
  checkout: async (id: number) => {
    const { data } = await api.patch<ApiResponse<OpCheckinVisit>>(`/visits/${id}/checkout`);
    return data.data;
  },
  startConsultation: async (id: number) => {
    const { data } = await api.post<ApiResponse<OpCheckinVisit>>(`/visits/${id}/start-consultation`);
    return data.data;
  },
};
