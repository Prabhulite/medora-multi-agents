import { api } from '../../lib/api';
import type {
  ApiResponse,
  CreateSpecializationPayload,
  Specialization,
  UpdateSpecializationPayload,
} from '../../types';

export const specializationsApi = {
  list: async () => {
    const { data } = await api.get<ApiResponse<Specialization[]>>('/specializations');
    return data.data;
  },
  listActive: async () => {
    const { data } = await api.get<ApiResponse<Specialization[]>>('/specializations/active');
    return data.data;
  },
  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<Specialization>>(`/specializations/${id}`);
    return data.data;
  },
  create: async (payload: CreateSpecializationPayload) => {
    const { data } = await api.post<ApiResponse<Specialization>>('/specializations', payload);
    return data.data;
  },
  update: async (id: number, payload: UpdateSpecializationPayload) => {
    const { data } = await api.put<ApiResponse<Specialization>>(`/specializations/${id}`, payload);
    return data.data;
  },
  remove: async (id: number) => {
    await api.delete(`/specializations/${id}`);
  },
};
