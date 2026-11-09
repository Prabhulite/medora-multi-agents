import { api } from '../../lib/api';
import type { ApiResponse, Doctor, UpsertDoctorPayload } from '../../types';

export const doctorsApi = {
  list: async () => {
    const { data } = await api.get<ApiResponse<Doctor[]>>('/doctors');
    return data.data;
  },
  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<Doctor>>(`/doctors/${id}`);
    return data.data;
  },
  create: async (payload: UpsertDoctorPayload) => {
    const { data } = await api.post<ApiResponse<Doctor>>('/doctors', payload);
    return data.data;
  },
  update: async (id: number, payload: UpsertDoctorPayload) => {
    const { data } = await api.put<ApiResponse<Doctor>>(`/doctors/${id}`, payload);
    return data.data;
  },
  remove: async (id: number) => {
    await api.delete(`/doctors/${id}`);
  },
};
