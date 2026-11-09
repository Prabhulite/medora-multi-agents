import { api } from '../../lib/api';
import type {
  ApiResponse,
  CreateDepartmentPayload,
  Department,
  UpdateDepartmentPayload,
} from '../../types';

export const departmentsApi = {
  list: async () => {
    const { data } = await api.get<ApiResponse<Department[]>>('/departments');
    return data.data;
  },
  listActive: async () => {
    const { data } = await api.get<ApiResponse<Department[]>>('/departments/active');
    return data.data;
  },
  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<Department>>(`/departments/${id}`);
    return data.data;
  },
  create: async (payload: CreateDepartmentPayload) => {
    const { data } = await api.post<ApiResponse<Department>>('/departments', payload);
    return data.data;
  },
  update: async (id: number, payload: UpdateDepartmentPayload) => {
    const { data } = await api.put<ApiResponse<Department>>(`/departments/${id}`, payload);
    return data.data;
  },
  remove: async (id: number) => {
    await api.delete(`/departments/${id}`);
  },
};
